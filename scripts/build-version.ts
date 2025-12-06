#!/usr/bin/env bun

import { writeFileSync, readFileSync } from "fs";
import { resolve, join, dirname } from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildDir = resolve(__dirname, "../drawink-app/build");
const versionFile = join(buildDir, "version.json");
const indexFile = join(buildDir, "index.html");

const versionDate = (date: Date): string => date.toISOString().replace(".000", "");

const commitHash = (): string => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "none";
  }
};

const commitDate = (hash: string): string => {
  try {
    const unix = execSync(`git show -s --format=%ct ${hash}`).toString().trim();
    const date = new Date(parseInt(unix) * 1000);
    return versionDate(date);
  } catch {
    return versionDate(new Date());
  }
};

const getFullVersion = (): string => {
  const hash = commitHash();
  return `${commitDate(hash)}-${hash}`;
};

const data = JSON.stringify(
  {
    version: getFullVersion(),
  },
  undefined,
  2,
);

writeFileSync(versionFile, data);

try {
  const indexData = readFileSync(indexFile, "utf8");
  const result = indexData.replace(/{version}/g, getFullVersion());
  writeFileSync(indexFile, result, "utf8");
  console.log(`✅ Version ${getFullVersion()} written to build files`);
} catch (error) {
  console.error("Error updating index.html:", error);
}
