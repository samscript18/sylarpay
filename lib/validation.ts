import { z } from "zod";
import { StrKey } from "@stellar/stellar-sdk";
export const usernameSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/^@/, "").toLowerCase())
  .pipe(
    z
      .string()
      .regex(
        /^[a-z0-9_]{3,24}$/,
        "Use 3–24 lowercase letters, numbers, or underscores.",
      ),
  );
export const addressSchema = z
  .string()
  .refine(StrKey.isValidEd25519PublicKey, "Invalid Stellar account.");
export const hashSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, "Invalid transaction hash.");
export function units(value: string): bigint {
  if (!/^(0|[1-9]\d{0,12})(\.\d{1,7})?$/.test(value))
    throw new Error("Enter a valid amount with up to 7 decimal places.");
  const [whole, fraction = ""] = value.split(".");
  const result = BigInt(whole) * 10000000n + BigInt(fraction.padEnd(7, "0"));
  if (result > 9223372036854775807n) throw new Error("Amount is too large.");
  return result;
}
export const amountSchema = z.string().refine((v) => {
  try {
    return units(v) > 0n;
  } catch {
    return false;
  }
}, "Enter an amount greater than zero with up to 7 decimal places.");
export function displayAmount(value: string) {
  const [w, f = ""] = value.split(".");
  return `${w.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${f.padEnd(2, "0").replace(/0+$/, "").padEnd(2, "0")}`;
}
export const paymentSchema = z.object({
  txHash: hashSchema,
  username: usernameSchema,
  amount: amountSchema,
});
export const profileSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(2).max(60),
  bio: z.string().trim().max(160),
});
