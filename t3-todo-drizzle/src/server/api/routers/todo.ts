// src/server/api/routers/todo.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { todos } from "~/server/db/schema";
import { desc, eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export const todoRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(todos)
      .orderBy(desc(todos.createdAt));
    return rows;
  }),

  create: publicProcedure
    .input(z.object({ title: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const row = {
        id: createId(),
        title: input.title,
        completed: false,
        createdAt: now,
        updatedAt: now,
      };
      await ctx.db.insert(todos).values(row);
      return row;
    }),

  toggle: publicProcedure
    .input(z.object({ id: z.string(), completed: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(todos)
        .set({ completed: input.completed, updatedAt: new Date() })
        .where(eq(todos.id, input.id))
        .execute();
      return { ok: true };
    }),

  updateTitle: publicProcedure
    .input(z.object({ id: z.string(), title: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(todos)
        .set({ title: input.title, updatedAt: new Date() })
        .where(eq(todos.id, input.id))
        .execute();
      return { ok: true };
    }),

  remove: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(todos).where(eq(todos.id, input.id)).execute();
      return { ok: true };
    }),
});
