import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const url = process.env.DATABASE_URL ?? "file:./db.sqlite";
// "file:./db.sqlite" → "./db.sqlite" に変換
const sqlitePath = url.replace(/^file:/, "");

const sqlite = new Database(sqlitePath);
export const db = drizzle(sqlite);