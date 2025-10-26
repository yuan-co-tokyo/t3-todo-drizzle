import { and, eq, isNull } from "drizzle-orm";
import { todos } from "../../db/schema.js";

// Drizzle の update チェーンで利用する最小限の型
type UpdateExecuteBuilder = {
  execute(): Promise<unknown>;
};

type UpdateWhereBuilder = UpdateExecuteBuilder & {
  where(condition: unknown): UpdateExecuteBuilder;
};

type UpdateSetBuilder = {
  set(values: { deletedAt: Date; updatedAt: Date }): UpdateWhereBuilder;
};

export type TodoDatabaseClient = {
  update(table: typeof todos): UpdateSetBuilder;
};

/**
 * Todo を論理削除する
 */
export async function markTodoAsDeleted(db: TodoDatabaseClient, id: string) {
  const now = new Date();
  await db
    .update(todos)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(todos.id, id), isNull(todos.deletedAt)))
    .execute();
}
