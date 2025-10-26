// src/server/api/routers/todo.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { todos } from "~/server/db/schema";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { markTodoAsDeleted, restoreTodo } from "~/server/api/services/todo";

const todoStatusSchema = z.enum(["all", "active", "completed"]);

export const todoRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ status: todoStatusSchema }).optional())
    .query(async ({ ctx, input }) => {
      const status = input?.status ?? "all";

      const baseCondition = isNull(todos.deletedAt);
      const whereCondition =
        status === "active"
          ? and(baseCondition, eq(todos.completed, false))
          : status === "completed"
            ? and(baseCondition, eq(todos.completed, true))
            : baseCondition;

      const rows = await ctx.db
        .select()
        .from(todos)
        .where(whereCondition)
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
        .where(and(eq(todos.id, input.id), isNull(todos.deletedAt)))
        .execute();
      return { ok: true };
    }),

  updateTitle: publicProcedure
    .input(z.object({ id: z.string(), title: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(todos)
        .set({ title: input.title, updatedAt: new Date() })
        .where(and(eq(todos.id, input.id), isNull(todos.deletedAt)))
        .execute();
      return { ok: true };
    }),

  remove: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [todo] = await ctx.db
        .select()
        .from(todos)
        .where(and(eq(todos.id, input.id), isNull(todos.deletedAt)))
        .limit(1);

      if (!todo) {
        return { ok: false, todo: null };
      }

      await markTodoAsDeleted(ctx.db, input.id);
      return { ok: true, todo };
    }),

  restore: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await restoreTodo(ctx.db, input.id);
      return { ok: true };
    }),

  listDeleted: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(todos)
      .where(isNotNull(todos.deletedAt))
      .orderBy(desc(todos.deletedAt));
    return rows;
  }),
});
