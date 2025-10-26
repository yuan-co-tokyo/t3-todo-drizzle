import { mkdir, readdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { build } from "esbuild";

const rootDir = resolve(process.cwd());
const testsDir = join(rootDir, "tests");
const outDir = join(rootDir, ".tmp/tests/tests");

const entryPoints = await collectTestFiles(testsDir);

await mkdir(outDir, { recursive: true });

await build({
  entryPoints,
  outdir: outDir,
  bundle: true,
  format: "esm",
  platform: "node",
  target: ["node22"],
  alias: {
    "~": "./src",
  },
  loader: {
    ".ts": "ts",
    ".tsx": "tsx",
  },
  external: [
    "react",
    "react-dom",
    "next",
    "@tanstack/react-query",
    "@trpc/client",
    "@trpc/react-query",
    "@trpc/server",
    "drizzle-orm",
    "pg",
    "superjson",
    "zod",
  ],
  sourcemap: false,
  logLevel: "error",
  jsx: "automatic",
});

async function collectTestFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name === "utils" || entry.name === "types") {
        continue;
      }
      const nested = await collectTestFiles(join(dir, entry.name));
      files.push(...nested);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = extname(entry.name);
    if (![".ts", ".tsx"].includes(ext)) continue;
    if (!entry.name.endsWith(".test.ts") && !entry.name.endsWith(".test.tsx")) {
      continue;
    }
    files.push(join(dir, entry.name));
  }
  return files;
}
