#!/usr/bin/env bun

import { $ } from "bun";

// Get files changed between prev and head commit
const result = await $`git diff --name-only HEAD^ HEAD`.quiet();
const changedFiles = result.stdout.toString().trim().split("\n");

const docFiles = changedFiles.filter((file) => file.indexOf("docs") >= 0);

if (!docFiles.length) {
  console.info("Skipping building docs as no valid diff found");
  process.exit(0);
}

// Exit code 1 to build the docs in ignoredBuildStep
process.exit(1);
