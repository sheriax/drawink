#!/usr/bin/env node

import fs from "fs";
import { glob } from "glob";

const mapping = {
  "@drawink/drawink": "@/core",
  "@drawink/element": "@/lib/elements",
  "@drawink/common": "@/lib/common",
  "@drawink/math": "@/lib/math",
  "@drawink/utils": "@/lib/utils",
  "@drawink/types": "@/lib/types",
  "@drawink/trpc": "@/api",
  "@drawink/ui": "@/ui/primitives",
};

console.log("🔄 Starting import migration...\n");

const files = await glob("src/**/*.{ts,tsx}", {
  ignore: ["**/node_modules/**", "**/dist/**"],
});

console.log(`Found ${files.length} files to process\n`);

let totalChanges = 0;
let filesChanged = 0;

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  let changed = false;
  let fileChanges = 0;

  for (const [oldPath, newPath] of Object.entries(mapping)) {
    const regex = new RegExp(`(from\\s+["'])${oldPath.replace(/\//g, "\\/")}(\\/[^"']*)?["']`, "g");

    const matches = content.match(regex);
    if (matches) {
      content = content.replace(regex, (match, prefix, subpath) => {
        fileChanges++;
        return `${prefix}${newPath}${subpath || ""}"`;
      });
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, "utf8");
    console.log(`✓ ${file} (${fileChanges} imports updated)`);
    totalChanges += fileChanges;
    filesChanged++;
  }
}

console.log(`\n✅ Migration complete!`);
console.log(`📊 Updated ${totalChanges} imports across ${filesChanged} files`);
console.log(`📁 Total files scanned: ${files.length}`);
