import test from "node:test";
import assert from "node:assert/strict";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core/dialect";
import { markTodoAsDeleted, restoreTodo } from "../src/server/api/services/todo.js";

type TodoRow = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

const createMockTodo = (overrides: Partial<TodoRow>): TodoRow => ({
  id: "todo-id",
  title: "sample",
  completed: false,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  deletedAt: null,
  ...overrides,
});

const createMockDb = (rows: TodoRow[]) => {
  const whereCalls: SQL[] = [];
  return {
    db: {
      select() {
        return {
          from() {
            return {
              where(condition: SQL) {
                whereCalls.push(condition);
                return {
                  orderBy() {
                    return Promise.resolve(rows);
                  },
                };
              },
            };
          },
        };
      },
    },
    whereCalls,
  } as const;
};

let cachedTodoRouter: Awaited<ReturnType<typeof importTodoRouter>> | null = null;

async function importTodoRouter() {
  if (!process.env.DATABASE_URL) {
    Object.assign(process.env, {
      DATABASE_URL: "postgres://user:pass@localhost:5432/test",
    });
  }
  if (!process.env.NODE_ENV) {
    Object.assign(process.env, { NODE_ENV: "test" });
  }
  const module = await import("../src/server/api/routers/todo.js");
  return module.todoRouter;
}

async function getTodoRouter() {
  if (!cachedTodoRouter) {
    cachedTodoRouter = await importTodoRouter();
  }
  return cachedTodoRouter;
}

// markTodoAsDeleted の動作確認
// 論理削除で deletedAt と updatedAt を更新することを確認する

test("markTodoAsDeleted は deletedAt と updatedAt を設定する", async () => {
  const execute = async () => {
    // 疑似的な execute なので何もしない
  };

  const builder = {
    set(value: { deletedAt: Date; updatedAt: Date }) {
      builder.lastSet = value;
      return builder;
    },
    where(_: unknown) {
      return builder;
    },
    async execute() {
      await execute();
    },
    lastSet: undefined as { deletedAt: Date; updatedAt: Date } | undefined,
  };

  const db = {
    update() {
      return builder;
    },
  } as Parameters<typeof markTodoAsDeleted>[0];

  await markTodoAsDeleted(db, "todo-1");

  assert.ok(builder.lastSet, "set が呼ばれていること");
  assert.ok(builder.lastSet?.deletedAt instanceof Date);
  assert.ok(builder.lastSet?.updatedAt instanceof Date);
});

test("restoreTodo は deletedAt を null に戻す", async () => {
  const execute = async () => {
    // 疑似的な execute なので何もしない
  };

  const builder = {
    set(value: { deletedAt: Date | null; updatedAt: Date }) {
      builder.lastSet = value;
      return builder;
    },
    where(_: unknown) {
      return builder;
    },
    async execute() {
      await execute();
    },
    lastSet: undefined as { deletedAt: Date | null; updatedAt: Date } | undefined,
  };

  const db = {
    update() {
      return builder;
    },
  } as Parameters<typeof restoreTodo>[0];

  await restoreTodo(db, "todo-restore");

  assert.ok(builder.lastSet, "set が呼ばれていること");
  assert.strictEqual(builder.lastSet?.deletedAt, null);
  assert.ok(builder.lastSet?.updatedAt instanceof Date);
});

test("todoRouter.list は削除済みを除外して全件を返す", async () => {
  const rows = [createMockTodo({ id: "todo-1" })];
  const { db, whereCalls } = createMockDb(rows);
  const todoRouter = await getTodoRouter();
  const caller = todoRouter.createCaller({
    db,
    headers: new Headers(),
  } as unknown as Parameters<typeof todoRouter.createCaller>[0]);

  const result = await caller.list();

  assert.deepEqual(result, rows);
  assert.strictEqual(whereCalls.length, 1);

  const dialect = new PgDialect();
  const query = dialect.sqlToQuery(whereCalls[0]!);
  assert.strictEqual(query.sql, '"Todo"."deletedAt" is null');
  assert.deepEqual(query.params, []);
});

test("todoRouter.list は active 指定で未完了のみを返す", async () => {
  const rows = [createMockTodo({ id: "todo-2", completed: false })];
  const { db, whereCalls } = createMockDb(rows);
  const todoRouter = await getTodoRouter();
  const caller = todoRouter.createCaller({
    db,
    headers: new Headers(),
  } as unknown as Parameters<typeof todoRouter.createCaller>[0]);

  await caller.list({ status: "active" });

  assert.strictEqual(whereCalls.length, 1);
  const dialect = new PgDialect();
  const query = dialect.sqlToQuery(whereCalls[0]!);
  assert.strictEqual(query.sql, '("Todo"."deletedAt" is null and "Todo"."completed" = $1)');
  assert.deepEqual(query.params, [false]);
});

test("todoRouter.list は completed 指定で完了済みのみを返す", async () => {
  const rows = [createMockTodo({ id: "todo-3", completed: true })];
  const { db, whereCalls } = createMockDb(rows);
  const todoRouter = await getTodoRouter();
  const caller = todoRouter.createCaller({
    db,
    headers: new Headers(),
  } as unknown as Parameters<typeof todoRouter.createCaller>[0]);

  await caller.list({ status: "completed" });

  assert.strictEqual(whereCalls.length, 1);
  const dialect = new PgDialect();
  const query = dialect.sqlToQuery(whereCalls[0]!);
  assert.strictEqual(query.sql, '("Todo"."deletedAt" is null and "Todo"."completed" = $1)');
  assert.deepEqual(query.params, [true]);
});

test("todoRouter.listDeleted は削除済みのみを返す", async () => {
  const rows = [createMockTodo({ id: "todo-4", deletedAt: new Date() })];
  const { db, whereCalls } = createMockDb(rows);
  const todoRouter = await getTodoRouter();
  const caller = todoRouter.createCaller({
    db,
    headers: new Headers(),
  } as unknown as Parameters<typeof todoRouter.createCaller>[0]);

  const result = await caller.listDeleted();

  assert.deepEqual(result, rows);
  assert.strictEqual(whereCalls.length, 1);

  const dialect = new PgDialect();
  const query = dialect.sqlToQuery(whereCalls[0]!);
  assert.strictEqual(query.sql, '"Todo"."deletedAt" is not null');
  assert.deepEqual(query.params, []);
});
