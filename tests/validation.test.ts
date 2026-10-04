import { describe, it, expect } from "vitest";
import { amountSchema, units, usernameSchema } from "@/lib/validation";
import { getConfig, explorer } from "@/lib/config";
import { Keypair } from "@stellar/stellar-sdk";
describe("payment inputs and network configuration", () => {
  it("normalizes deterministic username input", () => {
    expect(usernameSchema.parse("@SaM")).toBe("sam");
    for (const n of ["ab", "sam smith", "sam-1", "@", "a".repeat(25)])
      expect(usernameSchema.safeParse(n).success).toBe(false);
  });
  it("compares money exactly in stroops", () => {
    expect(units("150.00")).toBe(units("150.0000000"));
    expect(units("0.0000001")).toBe(1n);
    for (const a of [
      "0",
      "-1",
      "1e2",
      "NaN",
      "1.00000001",
      "922337203685.4775808",
    ])
      expect(amountSchema.safeParse(a).success).toBe(false);
  });
  it("generates network-specific explorer links", () => {
    expect(explorer("mainnet", "a".repeat(64))).toContain("/public/tx/");
    expect(() => explorer("testnet", "made-up")).toThrow();
  });
  it("refuses mixed issuers and production demo", () => {
    const old = { ...process.env };
    try {
      process.env.STELLAR_NETWORK = "testnet";
      process.env.USDC_ISSUER =
        "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
      expect(() => getConfig()).toThrow("other network");
      process.env.USDC_ISSUER = Keypair.random().publicKey();
      process.env.NEXT_PUBLIC_DEMO_MODE = "true";
      Object.assign(process.env, { NODE_ENV: "production" });
      expect(() => getConfig()).toThrow("development");
    } finally {
      process.env = old;
    }
  });
});
