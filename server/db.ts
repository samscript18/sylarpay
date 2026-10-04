import Database from "better-sqlite3";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
let singleton: Database.Database;
export function db() {
  if (singleton) return singleton;
  const path = (process.env.DATABASE_URL || ".data/skylarpay.sqlite").replace(
    /^file:/,
    "",
  );
  mkdirSync(dirname(path), { recursive: true });
  singleton = new Database(path);
  chmodSync(path, 0o600);
  singleton.pragma("journal_mode = WAL");
  singleton.pragma("foreign_keys = ON");
  singleton.exec(`
 CREATE TABLE IF NOT EXISTS challenges (id TEXT PRIMARY KEY, account TEXT NOT NULL, xdr TEXT NOT NULL, expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, account TEXT NOT NULL, expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS profiles (account TEXT PRIMARY KEY, username TEXT NOT NULL, displayName TEXT NOT NULL, bio TEXT NOT NULL, updatedAt TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS payments (txHash TEXT NOT NULL, network TEXT NOT NULL, senderAddress TEXT NOT NULL, recipientAddress TEXT NOT NULL, username TEXT NOT NULL, assetCode TEXT NOT NULL, assetIssuer TEXT NOT NULL, amount TEXT NOT NULL, status TEXT NOT NULL, createdAt TEXT NOT NULL, confirmedAt TEXT, failureReason TEXT, PRIMARY KEY(network,txHash));
 CREATE TABLE IF NOT EXISTS notes (network TEXT NOT NULL, txHash TEXT NOT NULL, account TEXT NOT NULL, note TEXT NOT NULL, PRIMARY KEY(network,txHash,account));
 CREATE TABLE IF NOT EXISTS withdrawals (id TEXT PRIMARY KEY, account TEXT NOT NULL, network TEXT NOT NULL, idem TEXT NOT NULL, amount TEXT NOT NULL, currency TEXT NOT NULL, provider TEXT NOT NULL, status TEXT NOT NULL, anchorId TEXT, interactiveUrl TEXT, token TEXT, demo INTEGER NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, UNIQUE(account,network,idem));
 `);
  const columns = singleton.prepare("PRAGMA table_info(withdrawals)").all() as {
    name: string;
  }[];
  for (const name of ["fundingXdr", "fundingHash"]) {
    if (!columns.some((c) => c.name === name))
      singleton.exec(`ALTER TABLE withdrawals ADD COLUMN ${name} TEXT`);
  }
  return singleton;
}
export interface PaymentRecord {
  txHash: string;
  network: "testnet" | "mainnet";
  senderAddress: string;
  recipientAddress: string;
  username: string;
  assetCode: string;
  assetIssuer: string;
  amount: string;
  status: "PENDING" | "CONFIRMED" | "FAILED";
  createdAt: string;
  confirmedAt: string | null;
  failureReason: string | null;
  note?: string;
}
export interface Profile {
  account: string;
  username: string;
  displayName: string;
  bio: string;
}
