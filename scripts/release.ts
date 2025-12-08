#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";
import updateChangelog from "./updateChangelog";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PACKAGES = ["common", "math", "element", "drawink"];
const PACKAGES_DIR = resolve(__dirname, "../packages");

const getPackageJsonPath = (packageName: string): string => {
  if (!PACKAGES.includes(packageName)) {
    console.error(`Package "${packageName}" not found!`);
    process.exit(1);
  }
  return resolve(PACKAGES_DIR, packageName, "package.json");
};

const getShortCommitHash = (): string => {
  return execSync("git rev-parse --short HEAD").toString().trim();
};

/**
 * Parse CLI arguments
 */
const getArguments = (): [string, string, boolean] => {
  let tag = "test";
  let version = "";
  let nonInteractive = false;

  for (const argument of process.argv.slice(2)) {
    if (/--help/.test(argument)) {
      console.info(`Available arguments:
  --tag=<tag>                                    -> (optional) "test" (default), "next" for auto release, "latest" for stable release
  --version=<version>                            -> (optional) for "next" and "test", (required) for "latest" i.e. "0.19.0"
  --non-interactive                              -> (optional) disables interactive prompts`);

      console.info(`\nUsage examples:
  - bun run release                              -> publishes \`@drawink\` packages with "test" tag and "-[hash]" version suffix
  - bun run release --tag=test                   -> same as above
  - bun run release --tag=next                   -> publishes \`@drawink\` packages with "next" tag and version "-[hash]" suffix
  - bun run release --tag=next --non-interactive -> skips interactive prompts (runs on CI/CD), otherwise same as above
  - bun run release --tag=latest --version=0.19.0 -> publishes \`@drawink\` packages with "latest" tag and version "0.19.0" & prepares changelog for the release`);

      process.exit(0);
    }

    if (/--tag=/.test(argument)) {
      tag = argument.split("=")[1];
    }

    if (/--version=/.test(argument)) {
      version = argument.split("=")[1];
    }

    if (/--non-interactive/.test(argument)) {
      nonInteractive = true;
    }
  }

  if (tag !== "latest" && tag !== "next" && tag !== "test") {
    console.error(`Unsupported tag "${tag}", use "latest", "next" or "test".`);
    process.exit(1);
  }

  if (tag === "latest" && !version) {
    console.error("Pass the version to make the latest stable release!");
    process.exit(1);
  }

  if (!version) {
    const drawinkPackage = JSON.parse(readFileSync(getPackageJsonPath("drawink"), "utf-8"));
    const drawinkPackageVersion = drawinkPackage.version;
    const hash = getShortCommitHash();

    if (!drawinkPackageVersion.includes(hash)) {
      version = `${drawinkPackageVersion}-${hash}`;
    } else {
      version = drawinkPackageVersion;
    }
  }

  console.info(`Running with tag "${tag}" and version "${version}"...`);

  return [tag, version, nonInteractive];
};

const updatePackageJsons = (nextVersion: string): void => {
  const packageJsons = new Map<string, string>();

  for (const packageName of PACKAGES) {
    const pkg = JSON.parse(readFileSync(getPackageJsonPath(packageName), "utf-8"));
    pkg.version = nextVersion;

    if (pkg.dependencies) {
      for (const dependencyName of PACKAGES) {
        if (!pkg.dependencies[`@drawink/${dependencyName}`]) continue;
        pkg.dependencies[`@drawink/${dependencyName}`] = nextVersion;
      }
    }

    packageJsons.set(packageName, `${JSON.stringify(pkg, null, 2)}\n`);
  }

  for (const packageName of PACKAGES) {
    const content = packageJsons.get(packageName)!;
    writeFileSync(getPackageJsonPath(packageName), content, "utf-8");
  }
};

const askToCommit = (tag: string, nextVersion: string): Promise<void> => {
  if (tag !== "latest") return Promise.resolve();

  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      "Would you like to commit these changes to git? (Y/n): ",
      (answer) => {
        rl.close();
        if (answer.toLowerCase() === "y") {
          execSync(`git add -u`);
          execSync(`git commit -m "chore: release @drawink/drawink@${nextVersion} 🎉"`);
        } else {
          console.warn("Skipping commit. Don't forget to commit manually later!");
        }
        resolve();
      },
    );
  });
};

const buildPackages = (): void => {
  console.info("Running bun install...");
  execSync(`bun install --frozen-lockfile`, { stdio: "inherit" });

  console.info("Removing existing build artifacts...");
  execSync(`bun run rm:build`, { stdio: "inherit" });

  for (const packageName of PACKAGES) {
    console.info(`Building "@drawink/${packageName}"...`);
    execSync(`bun run build:esm`, {
      cwd: resolve(PACKAGES_DIR, packageName),
      stdio: "inherit",
    });
  }
};

const askToPublish = (tag: string, version: string): Promise<void> => {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      "Would you like to publish these changes to npm? (Y/n): ",
      (answer) => {
        rl.close();
        if (answer.toLowerCase() === "y") {
          publishPackages(tag, version);
        } else {
          console.info("Skipping publish.");
        }
        resolve();
      },
    );
  });
};

const publishPackages = (tag: string, version: string): void => {
  for (const packageName of PACKAGES) {
    execSync(`npm publish --tag ${tag}`, {
      cwd: resolve(PACKAGES_DIR, packageName),
      stdio: "inherit",
    });
    console.info(`Published "@drawink/${packageName}@${tag}" with version "${version}"! 🎉`);
  }
};

// Main
(async () => {
  const [tag, version, nonInteractive] = getArguments();

  buildPackages();

  if (tag === "latest") {
    await updateChangelog(version);
  }

  updatePackageJsons(version);

  if (nonInteractive) {
    publishPackages(tag, version);
  } else {
    await askToCommit(tag, version);
    await askToPublish(tag, version);
  }
})();
