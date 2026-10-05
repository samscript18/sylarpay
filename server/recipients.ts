import { usernameSchema } from "@/lib/validation";
import { db } from "./db";
import { AppError } from "./http";
import { resolveUsername } from "./registry";

export async function searchRecipients(input: string) {
  const query = usernameSchema.parse(input);
  const models = await db();
  // Profiles provide discovery only; every result is resolved against Soroban.
  const profiles = await models.Profile.find(
    { username: { $regex: `^${query}` } },
    { _id: 0, username: 1 },
  )
    .sort({ username: 1 })
    .limit(8)
    .lean();
  const names = [...new Set([query, ...profiles.map((p) => p.username)])].slice(
    0,
    8,
  );
  const matches = await Promise.all(
    names.map(async (name) => {
      try {
        const identity = await resolveUsername(name);
        const profile = await models.Profile.findOne(
          { account: identity.address },
          { _id: 0, displayName: 1, bio: 1 },
        ).lean();
        return {
          ...identity,
          profile: profile || { displayName: `@${name}`, bio: "" },
        };
      } catch (error) {
        if (error instanceof AppError && error.code === "USERNAME_NOT_FOUND")
          return null;
        throw error;
      }
    }),
  );
  return { matches: matches.filter((match) => match !== null) };
}
