import { access, mkdir, readdir } from "node:fs/promises";
import { extname, isAbsolute, join, resolve } from "node:path";
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
    "esbuild",
    "superjson",
    "zod",
  ],
  sourcemap: false,
  logLevel: "error",
  jsx: "automatic",
  plugins: [preferTypeScriptResolutionPlugin()],
});

export function preferTypeScriptResolutionPlugin() {
  return {
    name: "prefer-typescript-resolution",
    setup(build) {
      build.onResolve({ filter: /\.js$/ }, async (args) => {
        if (!args.path.startsWith(".") && !args.path.startsWith("/")) {
          return;
        }

        const basePath = args.path.slice(0, -3);
        for (const extension of [".ts", ".tsx"]) {
          const candidate = `${basePath}${extension}`;
          const absolutePath = isAbsolute(candidate)
            ? candidate
            : join(args.resolveDir, candidate);

          try {
            await access(absolutePath);
            // JS パスしか記述できない環境でも TypeScript を優先的に解決する
            return { path: absolutePath };
          } catch {
            // ファイルが存在しない場合は次の候補を確認する
          }
        }

        return;
      });
    },
  };
}

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
