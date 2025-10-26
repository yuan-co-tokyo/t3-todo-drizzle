import test from "node:test";
import assert from "node:assert/strict";
import { markTodoAsDeleted } from "../src/server/api/services/todo.js";

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
