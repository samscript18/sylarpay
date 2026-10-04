import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  nativeToScVal,
  scValToNative,
  rpc,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { getConfig } from "@/lib/config";
import { usernameSchema, addressSchema } from "@/lib/validation";
import { AppError, log } from "./http";
export function registry() {
  const c = getConfig();
  if (!c.contractId)
    throw new AppError(
      "Username registry is not configured. Deploy the testnet contract first.",
      503,
    );
  return { c, s: new rpc.Server(c.rpc), contract: new Contract(c.contractId) };
}
export async function checkRpc(s: rpc.Server, passphrase: string) {
  const n = await s.getNetwork();
  if (n.passphrase !== passphrase)
    throw new AppError("Soroban endpoint network mismatch.", 503);
}
export async function read(method: string, args: xdr.ScVal[]) {
  const { c, s, contract } = registry();
  await checkRpc(s, c.passphrase);
  const source = new Account(Keypair.random().publicKey(), "0");
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: c.passphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();
  const simulation = await s.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(simulation) || !simulation.result)
    throw new AppError(
      "Username registry could not resolve this request.",
      503,
    );
  return scValToNative(simulation.result.retval);
}
export async function resolveUsername(input: string) {
  const username = usernameSchema.parse(input);
  const exists = await read("exists", [
    nativeToScVal(username, { type: "string" }),
  ]);
  if (!exists)
    throw new AppError(
      `@${username} was not found.`,
      404,
      "USERNAME_NOT_FOUND",
    );
  const address = addressSchema.parse(
    await read("resolve", [nativeToScVal(username, { type: "string" })]),
  );
  const verified = Boolean(
    await read("verification_status", [new Address(address).toScVal()]),
  );
  log("username_resolved", { username });
  return { username, address, verified };
}
export async function prepareRegistry(
  account: string,
  method: string,
  args: xdr.ScVal[],
) {
  const { c, s, contract } = registry();
  await checkRpc(s, c.passphrase);
  const source = await s.getAccount(account);
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: c.passphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(180)
    .build();
  const sim = await s.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(sim))
    throw new AppError(
      "Unable to prepare username action. Check ownership, availability, and account funding.",
    );
  return rpc.assembleTransaction(tx, sim).build().toXDR();
}
export async function submitRegistry(signed: string) {
  const { c, s } = registry();
  await checkRpc(s, c.passphrase);
  const tx = TransactionBuilder.fromXDR(signed, c.passphrase);
  const result = await s.sendTransaction(tx);
  if (result.status === "ERROR")
    throw new AppError("Contract transaction was rejected.");
  for (let i = 0; i < 20; i++) {
    const r = await s.getTransaction(result.hash);
    if (r.status === "SUCCESS") return result.hash;
    if (r.status === "FAILED")
      throw new AppError("Contract transaction failed.");
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new AppError(
    "Contract transaction submitted but still pending. Refresh before retrying.",
    409,
  );
}
export async function verifyProfileOnChain(account: string) {
  if (!process.env.VERIFIER_SECRET)
    throw new AppError(
      "Profile saved. Skylar verification is not configured yet.",
      503,
    );
  const signer = Keypair.fromSecret(process.env.VERIFIER_SECRET);
  const { c } = registry();
  const unsigned = await prepareRegistry(
    signer.publicKey(),
    "set_verification",
    [new Address(account).toScVal(), nativeToScVal(true)],
  );
  const tx = TransactionBuilder.fromXDR(unsigned, c.passphrase);
  tx.sign(signer);
  await submitRegistry(tx.toXDR());
}
