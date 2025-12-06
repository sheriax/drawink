#!/usr/bin/env bun

// Server-side PNG export using node-canvas with Bun
//
// Prerequisites:
// 1. Install Cairo on your machine:
//    https://github.com/Automattic/node-canvas#compiling
//
// 2. Install canvas (Bun compatible version):
//    bun add canvas@3
//
// Usage:
//    bun run build-node
//    # or directly:
//    bun scripts/build-node.ts

import { $ } from "bun";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexNodePath = resolve(__dirname, "../packages/drawink/index-node.ts");

console.log("🎨 Running server-side PNG export...");
console.log(`   Entry: ${indexNodePath}`);

// Run index-node.ts directly with Bun
await $`bun run ${indexNodePath}`.cwd(resolve(__dirname, ".."));

console.log("✅ Done!");
