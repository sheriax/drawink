import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      // @/ -> src/ (must come first, general catch-all)
      { find: /^@\/(.*)/, replacement: path.resolve(__dirname, "./src/$1") },
      // Exact package imports (resolve to index files)
      { find: /^@drawink\/common$/, replacement: path.resolve(__dirname, "./src/lib/common/index.ts") },
      { find: /^@drawink\/element$/, replacement: path.resolve(__dirname, "./src/lib/elements/index.ts") },
      { find: /^@drawink\/drawink$/, replacement: path.resolve(__dirname, "./src/core/index.tsx") },
      { find: /^@drawink\/math$/, replacement: path.resolve(__dirname, "./src/lib/math/index.ts") },
      { find: /^@drawink\/utils$/, replacement: path.resolve(__dirname, "./src/lib/utils/index.ts") },
      // Subpath imports (resolve to directories)
      { find: /^@drawink\/common\/(.*)/, replacement: path.resolve(__dirname, "./src/lib/common/$1") },
      { find: /^@drawink\/element\/(.*)/, replacement: path.resolve(__dirname, "./src/lib/elements/$1") },
      { find: /^@drawink\/drawink\/(.*)/, replacement: path.resolve(__dirname, "./src/core/$1") },
      { find: /^@drawink\/math\/(.*)/, replacement: path.resolve(__dirname, "./src/lib/math/$1") },
      { find: /^@drawink\/utils\/(.*)/, replacement: path.resolve(__dirname, "./src/lib/utils/$1") },
      // External renamed packages
      { find: /^@drawink\/mermaid-to-drawink$/, replacement: path.resolve(__dirname, "./node_modules/@excalidraw/mermaid-to-excalidraw") },
    ],
  },
  //@ts-ignore
  test: {
    // Since hooks are running in stack in v2, which means all hooks run serially whereas
    // we need to run them in parallel
    sequence: {
      hooks: "parallel",
    },
    setupFiles: ["./setupTests.ts"],
    globals: true,
    environment: "jsdom",
    coverage: {
      reporter: ["text", "json-summary", "json", "html", "lcovonly"],
      thresholds: {
        lines: 60,
        branches: 70,
        functions: 63,
        statements: 60,
      },
    },
  },
});
