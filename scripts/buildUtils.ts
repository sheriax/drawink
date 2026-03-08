#!/usr/bin/env bun

import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { build } from "esbuild";
import { sassPlugin } from "esbuild-sass-plugin";

// @ts-ignore - woff2 plugin
import { woff2ServerPlugin } from "./woff2/woff2-esbuild-plugins";

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
    "@drawink/common": resolve(__dirname, "../packages/common/src"),
    "@drawink/element": resolve(__dirname, "../packages/element/src"),
    "@drawink/drawink": resolve(__dirname, "../packages/drawink"),
    "@drawink/math": resolve(__dirname, "../packages/math/src"),
    "@drawink/utils": resolve(__dirname, "../packages/utils/src"),
  },
});

function buildDev(config: ReturnType<typeof getConfig>) {
  return build({
    ...config,
    sourcemap: true,
    plugins: [sassPlugin(), woff2ServerPlugin()],
    define: {
      "import.meta.env": JSON.stringify({ DEV: true }),
    },
  });
}

function buildProd(config: ReturnType<typeof getConfig>) {
  return build({
    ...config,
    minify: true,
    plugins: [
      sassPlugin(),
      woff2ServerPlugin({
        outdir: `${config.outdir}/assets`,
      }),
    ],
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
console.log("✅ Utils build complete!");
