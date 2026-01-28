#!/usr/bin/env bun

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import { build } from "esbuild";
import { sassPlugin } from "esbuild-sass-plugin";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse env variables function
const parseEnvVariables = (envPath: string): Record<string, string> => {
  const content = readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    if (line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...valueParts] = line.split("=");
    const value = valueParts.join("=").replace(/^["']|["']$/g, "").trim();
    if (key) env[key.trim()] = value;
  }
  return env;
};

const ENV_VARS = {
  development: {
    ...parseEnvVariables(resolve(__dirname, "../.env.development")),
    DEV: true,
  },
  production: {
    ...parseEnvVariables(resolve(__dirname, "../.env.production")),
    PROD: true,
  },
};

// Excludes all external dependencies and bundles only the source code
const getConfig = (outdir: string) => ({
  outdir,
  bundle: true,
  splitting: true,
  format: "esm" as const,
  packages: "external" as const,
  plugins: [sassPlugin()],
  target: "es2020",
  assetNames: "[dir]/[name]",
  chunkNames: "[dir]/[name]-[hash]",
  alias: {
    "@drawink/utils": resolve(__dirname, "../packages/utils/src"),
  },
  external: ["@drawink/common", "@drawink/element", "@drawink/math"],
  loader: {
    ".woff2": "file" as const,
    ".png": "file" as const,
    ".jpg": "file" as const,
    ".jpeg": "file" as const,
    ".svg": "file" as const,
    ".gif": "file" as const,
  },
});

function buildDev(config: ReturnType<typeof getConfig>) {
  return build({
    ...config,
    sourcemap: true,
    define: {
      "import.meta.env": JSON.stringify(ENV_VARS.development),
    },
  });
}

function buildProd(config: ReturnType<typeof getConfig>) {
  return build({
    ...config,
    minify: true,
    define: {
      "import.meta.env": JSON.stringify(ENV_VARS.production),
    },
  });
}

const createESMRawBuild = async () => {
  const chunksConfig = {
    entryPoints: ["index.tsx", "**/*.chunk.ts"],
    entryNames: "[name]",
  };

  // Development unminified build with source maps
  await buildDev({
    ...getConfig("dist/dev"),
    ...chunksConfig,
  });

  // Production minified build without sourcemaps
  await buildProd({
    ...getConfig("dist/prod"),
    ...chunksConfig,
  });
};

await createESMRawBuild();
console.log("✅ Package build complete!");
