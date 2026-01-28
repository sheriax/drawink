// Browser globals polyfills for Node/Bun environment
// Must be defined BEFORE importing any drawink code
(globalThis as any).devicePixelRatio = 1;
(globalThis as any).window = globalThis;
(globalThis as any).document = {
  createElement: () => ({
    getContext: () => null,
    style: {},
    setAttribute: () => { },
    appendChild: () => { },
  }),
  body: { appendChild: () => { }, removeChild: () => { } },
  head: { appendChild: () => { } },
};
(globalThis as any).navigator = { userAgent: "node" };
(globalThis as any).matchMedia = () => ({ matches: false, addListener: () => { }, removeListener: () => { } });

import { DEFAULT_FONT_FAMILY } from "@/lib/common";
import type { Radians } from "@/lib/math";
import { getDefaultAppState } from "./appState";
import { exportToCanvas } from "./scene/export";
import { createWriteStream } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// node-canvas 3.x is Bun compatible
// @ts-ignore - canvas types not installed
import { createCanvas as nodeCreateCanvas } from "canvas";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Base element structure matching current drawink API
const elementBase = {
  x: 100,
  y: 100,
  width: 100,
  height: 100,
  angle: 0 as Radians,
  strokeColor: "#000000",
  backgroundColor: "transparent",
  fillStyle: "hachure" as const,
  strokeWidth: 1,
  strokeStyle: "solid" as const,
  roughness: 1,
  opacity: 100,
  groupIds: [] as string[],
  frameId: null,
  roundness: null,
  index: null,
  seed: 1041657908,
  version: 1,
  versionNonce: 1188004276,
  isDeleted: false,
  boundElements: null,
  updated: Date.now(),
  link: null,
  locked: false,
};

// Test elements with proper structure
const elements = [
  {
    ...elementBase,
    id: "diamond-1",
    type: "diamond" as const,
    x: 50,
    y: 50,
    width: 100,
    height: 100,
    seed: 749612521,
  },
  {
    ...elementBase,
    id: "ellipse-1",
    type: "ellipse" as const,
    x: 200,
    y: 50,
    width: 80,
    height: 80,
    seed: 952056308,
  },
  {
    ...elementBase,
    id: "rectangle-1",
    type: "rectangle" as const,
    x: 350,
    y: 50,
    width: 120,
    height: 80,
    seed: 123456789,
  },
];

// Custom createCanvas wrapper for node-canvas
const createCanvas = (width: number, height: number) => {
  const canvas = nodeCreateCanvas(width, height);
  return { canvas: canvas as unknown as HTMLCanvasElement, scale: 1 };
};

// Skip font loading in node environment  
const loadFonts = async () => {
  console.log("⚠️  Skipping font loading (node-canvas requires TTF fonts)");
};

async function main() {
  console.log("🎨 Exporting test canvas...");

  const appState = {
    ...getDefaultAppState(),
    offsetTop: 0,
    offsetLeft: 0,
    width: 600,
    height: 400,
    exportScale: 1,
  };

  const canvas = await exportToCanvas(
    elements as any,
    appState,
    {}, // files
    {
      exportBackground: true,
      viewBackgroundColor: "#ffffff",
      exportPadding: 20,
    },
    createCanvas,
    loadFonts,
  );

  const out = createWriteStream("test.png");
  const stream = (canvas as any).createPNGStream();
  stream.pipe(out);

  return new Promise<void>((resolve) => {
    out.on("finish", () => {
      console.info("✅ test.png was created.");
      resolve();
    });
  });
}

main().catch((err) => {
  console.error("❌ Export failed:", err);
  process.exit(1);
});
