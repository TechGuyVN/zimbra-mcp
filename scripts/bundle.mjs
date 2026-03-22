import * as esbuild from "esbuild";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

await esbuild.build({
  absWorkingDir: root,
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: ["node18"],
  outfile: "dist/index.js",
  minify: true,
  packages: "external",
  legalComments: "none",
  logLevel: "info",
});

console.log("build:release → dist/index.js (minify + bundle, deps external)");
