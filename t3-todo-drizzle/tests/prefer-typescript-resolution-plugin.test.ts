import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";
import { preferTypeScriptResolutionPlugin } from "./build-tests.mjs";

// TypeScript ファイルを優先的に解決できることを検証する

test("preferTypeScriptResolutionPlugin は .ts を解決する", async () => {
  const workDir = await mkdtemp(join(tmpdir(), "prefer-ts-"));
  const entryPath = join(workDir, "entry.ts");
  const targetPath = join(workDir, "target.ts");

  await writeFile(entryPath, "import { value } from './target.js'; export { value };");
  await writeFile(targetPath, "export const value = 42;");

  const result = await build({
    entryPoints: [entryPath],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    plugins: [preferTypeScriptResolutionPlugin()],
  });

  const output = result.outputFiles?.[0]?.text ?? "";
  assert.match(output, /value = 42/);
});
