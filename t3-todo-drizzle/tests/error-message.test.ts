import test from "node:test";
import assert from "node:assert/strict";

import { toErrorMessage } from "~/lib/error-message";

test("Error インスタンスからメッセージを抽出する", () => {
  const error = new Error("失敗しました");
  assert.strictEqual(toErrorMessage(error), "失敗しました");
});

test("空白のみの文字列は既定文に置き換える", () => {
  assert.strictEqual(toErrorMessage("   "), "予期しないエラーが発生しました");
});

test("未知の値は既定文を返す", () => {
  assert.strictEqual(toErrorMessage(123), "予期しないエラーが発生しました");
});
