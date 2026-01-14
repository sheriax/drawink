#!/usr/bin/env bun

// @ts-ignore - Bun-specific
import { $ } from "bun";
// @ts-ignore - Bun-specific
import { resolve, dirname } from "path";
// @ts-ignore - Bun-specific
import { fileURLToPath } from "url";

// @ts-ignore - Bun global
declare const process: any;

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

// Configuration
const CONFIG = {
  projectId: "drawink-2026",
  region: "asia-south1",
  serviceName: "drawink",
  imageName: "drawink",
  registry: `asia-south1-docker.pkg.dev/drawink-2026/drawink`,
  port: 3000,
} as const;

// Cloud Run optimized settings
const CLOUD_RUN_SETTINGS = [
  "--platform=managed",
  `--region=${CONFIG.region}`,
  `--port=${CONFIG.port}`,
  "--allow-unauthenticated",
  "--cpu-throttling",
  "--cpu=1",
  "--memory=256Mi",
  "--min-instances=0",
  "--max-instances=3",
  "--concurrency=80",
  "--timeout=300",
] as const;

function log(message: string, color = colors.cyan) {
  console.log(`${color}${colors.bright}${message}${colors.reset}`);
}

function error(message: string) {
  console.error(`${colors.red}${colors.bright}❌ ${message}${colors.reset}`);
}

function success(message: string) {
  console.log(`${colors.green}${colors.bright}✅ ${message}${colors.reset}`);
}

function step(message: string) {
  console.log(`\n${colors.blue}${colors.bright}→ ${message}${colors.reset}`);
}

async function checkPrerequisites(): Promise<boolean> {
  step("Checking prerequisites...");

  try {
    // Check Docker
    await $`docker --version`.quiet();
    success("Docker is installed");
  } catch {
    error("Docker is not installed or not running");
    console.log("Please install Docker Desktop: https://www.docker.com/products/docker-desktop");
    return false;
  }

  try {
    // Check gcloud
    await $`gcloud --version`.quiet();
    success("gcloud CLI is installed");
  } catch {
    error("gcloud CLI is not installed");
    console.log("Please install gcloud: https://cloud.google.com/sdk/docs/install");
    return false;
  }

  // Check if logged in to gcloud
  try {
    const result = await $`gcloud auth list --filter=status:ACTIVE --format="value(account)"`.quiet();
    const account = result.stdout.toString().trim();
    if (account) {
      success(`Logged in as: ${account}`);
    } else {
      error("Not logged in to gcloud");
      console.log("Run: gcloud auth login");
      return false;
    }
  } catch {
    error("Failed to check gcloud authentication");
    return false;
  }

  // Check project
  try {
    const result = await $`gcloud config get-value project`.quiet();
    const project = result.stdout.toString().trim();
    if (project === CONFIG.projectId) {
      success(`Project is set to: ${project}`);
    } else {
      log(`Current project: ${project}, switching to ${CONFIG.projectId}...`, colors.yellow);
      await $`gcloud config set project ${CONFIG.projectId}`.quiet();
      success(`Project set to: ${CONFIG.projectId}`);
    }
  } catch {
    error("Failed to check/set gcloud project");
    return false;
  }

  return true;
}

async function buildDockerImage(): Promise<boolean> {
  step("Building Docker image...");

  try {
    // @ts-ignore - Bun-specific
    const __dirname = import.meta.dir || dirname(fileURLToPath(import.meta.url));
    const rootDir = resolve(__dirname, "..");
    await $`docker build --platform linux/amd64 -t ${CONFIG.imageName}:latest ${rootDir}`.quiet();
    success("Docker image built successfully");
    return true;
  } catch (e) {
    error("Failed to build Docker image");
    console.error(e);
    return false;
  }
}

async function tagImage(): Promise<boolean> {
  step("Tagging image for Artifact Registry...");

  try {
    const imageTag = `${CONFIG.registry}/${CONFIG.imageName}:latest`;
    await $`docker tag ${CONFIG.imageName}:latest ${imageTag}`.quiet();
    success(`Image tagged as: ${imageTag}`);
    return true;
  } catch (e) {
    error("Failed to tag Docker image");
    console.error(e);
    return false;
  }
}

async function pushImage(): Promise<boolean> {
  step("Pushing image to Artifact Registry...");

  try {
    // Ensure Docker is authenticated
    await $`gcloud auth configure-docker ${CONFIG.region}-docker.pkg.dev --quiet`.quiet();

    const imageTag = `${CONFIG.registry}/${CONFIG.imageName}:latest`;
    await $`docker push ${imageTag}`.quiet();
    success("Image pushed to Artifact Registry");
    return true;
  } catch (e) {
    error("Failed to push Docker image");
    console.error(e);
    return false;
  }
}

async function deployToCloudRun(quick = false): Promise<boolean> {
  step("Deploying to Cloud Run...");

  if (!quick) {
    log("This will deploy with the following optimized settings:", colors.yellow);
    console.log("  - CPU throttling: enabled");
    console.log("  - Memory: 256Mi");
    console.log("  - Max instances: 3");
    console.log("  - Timeout: 300s");
    console.log("  - Concurrency: 80");
    console.log("\nPress Ctrl+C to cancel, or wait 3 seconds to continue...");

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  try {
    const imageTag = `${CONFIG.registry}/${CONFIG.imageName}:latest`;
    const deployCmd = [
      "gcloud",
      "run",
      "deploy",
      CONFIG.serviceName,
      `--image=${imageTag}`,
      `--project=${CONFIG.projectId}`,
      ...CLOUD_RUN_SETTINGS,
    ];

    await $`${deployCmd}`.quiet();
    success("Deployed to Cloud Run successfully");
    return true;
  } catch (e) {
    error("Failed to deploy to Cloud Run");
    console.error(e);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const quick = args.includes("--quick") || args.includes("-q");

  console.log(`${colors.bright}🚀 Drawink Deployment Script${colors.reset}\n`);
  console.log(`Project: ${CONFIG.projectId}`);
  console.log(`Region: ${CONFIG.region}`);
  console.log(`Service: ${CONFIG.serviceName}\n`);

  // Check prerequisites
  if (!(await checkPrerequisites())) {
    process.exit(1);
  }

  // Build Docker image
  if (!(await buildDockerImage())) {
    process.exit(1);
  }

  // Tag image
  if (!(await tagImage())) {
    process.exit(1);
  }

  // Push image
  if (!(await pushImage())) {
    process.exit(1);
  }

  // Deploy to Cloud Run
  if (!(await deployToCloudRun(quick))) {
    process.exit(1);
  }

  console.log(`\n${colors.green}${colors.bright}🎉 Deployment complete!${colors.reset}`);
  console.log(`\nService URL: https://${CONFIG.serviceName}-731425062456.${CONFIG.region}.run.app`);
  console.log(`Custom Domain: https://drawink.app`);
}

main().catch((error) => {
  error("Fatal error during deployment");
  console.error(error);
  process.exit(1);
});
