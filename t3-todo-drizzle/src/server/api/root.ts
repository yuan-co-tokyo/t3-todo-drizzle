// src/server/api/root.ts
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { todoRouter } from "./routers/todo";

export const appRouter = createTRPCRouter({
  todo: todoRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);