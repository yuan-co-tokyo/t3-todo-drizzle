// src/server/api/routers/todo.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db/db";
import { todos } from "~/server/db/schema";
import { desc, eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export const todoRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    const rows = await db.select().from(todos).orderBy(desc(todos.createdAt));
    return rows;
  }),

  create: publicProcedure
    .input(z.object({ title: z.string().min(1).max(200) }))
    .mutation(async ({ input }) => {
      const now = Date.now();
      const row = {
        id: createId(),
        title: input.title,
        completed: false,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      };
      await db.insert(todos).values(row).run();
      return row;
    }),

  toggle: publicProcedure
    .input(z.object({ id: z.string(), completed: z.boolean() }))
    .mutation(async ({ input }) => {
      await db
        .update(todos)
        .set({ completed: input.completed, updatedAt: new Date() })
        .where(eq(todos.id, input.id))
        .run();
      return { ok: true };
    }),

  updateTitle: publicProcedure
    .input(z.object({ id: z.string(), title: z.string().min(1).max(200) }))
    .mutation(async ({ input }) => {
      await db
        .update(todos)
        .set({ title: input.title, updatedAt: new Date() })
        .where(eq(todos.id, input.id))
        .run();
      return { ok: true };
    }),

  remove: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(todos).where(eq(todos.id, input.id)).run();
      return { ok: true };
    }),
});