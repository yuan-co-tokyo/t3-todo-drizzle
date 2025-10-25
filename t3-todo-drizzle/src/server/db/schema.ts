import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const todos = sqliteTable("Todo", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  completed: integer("completed", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});