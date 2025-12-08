#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "fs";
import { promisify } from "util";
import { exec as execCallback } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const exec = promisify(execCallback);
const __dirname = dirname(fileURLToPath(import.meta.url));

const drawinkDir = resolve(__dirname, "../packages/drawink");
const drawinkPackage = resolve(drawinkDir, "package.json");
const pkg = JSON.parse(readFileSync(drawinkPackage, "utf-8"));
const lastVersion = pkg.version;
const existingChangeLog = readFileSync(resolve(drawinkDir, "CHANGELOG.md"), "utf8");

const supportedTypes = ["feat", "fix", "style", "refactor", "perf", "build"];
const headerForType: Record<string, string> = {
  feat: "Features",
  fix: "Fixes",
  style: "Styles",
  refactor: " Refactor",
  perf: "Performance",
  build: "Build",
};

const badCommits: string[] = [];

const getCommitHashForLastVersion = async (): Promise<string> => {
  try {
    const commitMessage = `"release @drawink/drawink"`;
    const { stdout } = await exec(
      `git log --format=format:"%H" --grep=${commitMessage}`,
    );
    return stdout.split(/\r?\n/)[0];
  } catch (error) {
    console.error(error);
    return "";
  }
};

const getLibraryCommitsSinceLastRelease = async (): Promise<Record<string, string[]>> => {
  const commitHash = await getCommitHashForLastVersion();
  const { stdout } = await exec(
    `git log --pretty=format:%s ${commitHash}...master`,
  );
  const commitsSinceLastRelease = stdout.split("\n");
  const commitList: Record<string, string[]> = {};
  supportedTypes.forEach((type) => {
    commitList[type] = [];
  });

  commitsSinceLastRelease.forEach((commit) => {
    const indexOfColon = commit.indexOf(":");
    const type = commit.slice(0, indexOfColon);
    if (!supportedTypes.includes(type)) return;

    const messageWithoutType = commit.slice(indexOfColon + 1).trim();
    const messageWithCapitalizeFirst =
      messageWithoutType.charAt(0).toUpperCase() + messageWithoutType.slice(1);
    const prMatch = commit.match(/\(#([0-9]*)\)/);

    if (prMatch) {
      const prNumber = prMatch[1];
      if (existingChangeLog.includes(prNumber)) return;
      const prMarkdown = `[#${prNumber}](https://github.com/drawink/drawink/pull/${prNumber})`;
      const messageWithPRLink = messageWithCapitalizeFirst.replace(
        /\(#[0-9]*\)/,
        prMarkdown,
      );
      commitList[type].push(messageWithPRLink);
    } else {
      badCommits.push(commit);
      commitList[type].push(messageWithCapitalizeFirst);
    }
  });
  console.info("Bad commits:", badCommits);
  return commitList;
};

const updateChangelog = async (nextVersion: string): Promise<void> => {
  const commitList = await getLibraryCommitsSinceLastRelease();
  let changelogForLibrary =
    "## Drawink Library\n\n**_This section lists the updates made to the drawink library and will not affect the integration._**\n\n";

  supportedTypes.forEach((type) => {
    if (commitList[type].length) {
      changelogForLibrary += `### ${headerForType[type]}\n\n`;
      const commits = commitList[type];
      commits.forEach((commit) => {
        changelogForLibrary += `- ${commit}\n\n`;
      });
    }
  });

  changelogForLibrary += "---\n";
  const lastVersionIndex = existingChangeLog.indexOf(`## ${lastVersion}`);
  let updatedContent =
    existingChangeLog.slice(0, lastVersionIndex) +
    changelogForLibrary +
    existingChangeLog.slice(lastVersionIndex);
  const currentDate = new Date().toISOString().slice(0, 10);
  const newVersion = `## ${nextVersion} (${currentDate})`;
  updatedContent = updatedContent.replace(`## Unreleased`, newVersion);
  writeFileSync(resolve(drawinkDir, "CHANGELOG.md"), updatedContent, "utf8");
};

export default updateChangelog;
