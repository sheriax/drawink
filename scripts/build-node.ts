#!/usr/bin/env bun

// Server-side PNG export using node-canvas with Bun
//
// Prerequisites:
// 1. Install Cairo on your machine:
//    https://github.com/Automattic/node-canvas#compiling
//
// 2. Install canvas:
//    bun add canvas@3
//
// Usage:
//    bun run build-node
//    # or directly:
//    bun scripts/build-node.ts

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const polyfillsPath = resolve(__dirname, "browser-polyfills.ts");
const indexNodePath = resolve(__dirname, "../packages/drawink/index-node.ts");

console.log("🎨 Running server-side PNG export...");
console.log(`   Polyfills: ${polyfillsPath}`);
console.log(`   Entry: ${indexNodePath}`);

// Run index-node.ts with polyfills preloaded
const result = spawnSync("bun", ["--preload", polyfillsPath, indexNodePath], {
  cwd: resolve(__dirname, ".."),
  stdio: "inherit",
  env: { ...process.env },
});

if (result.status !== 0) {
  console.error("❌ Build failed with exit code:", result.status);
  process.exit(result.status ?? 1);
}

console.log("✅ Done!");
