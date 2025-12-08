#!/usr/bin/env bun

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { build } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Contains all dependencies bundled inside
const getConfig = (outdir: string) => ({
  outdir,
  bundle: true,
  format: "esm" as const,
  entryPoints: ["src/index.ts"],
  entryNames: "[name]",
  assetNames: "[dir]/[name]",
  alias: {
    "@drawink/utils": resolve(__dirname, "../packages/utils/src"),
  },
  external: ["@drawink/common", "@drawink/element", "@drawink/math"],
});

function buildDev(config: ReturnType<typeof getConfig>) {
  return build({
    ...config,
    sourcemap: true,
    define: {
      "import.meta.env": JSON.stringify({ DEV: true }),
    },
  });
}

function buildProd(config: ReturnType<typeof getConfig>) {
  return build({
    ...config,
    minify: true,
    define: {
      "import.meta.env": JSON.stringify({ PROD: true }),
    },
  });
}

const createESMRawBuild = async () => {
  // Development unminified build with source maps
  await buildDev(getConfig("dist/dev"));

  // Production minified build without sourcemaps
  await buildProd(getConfig("dist/prod"));
};

await createESMRawBuild();
console.log("✅ Build complete!");
