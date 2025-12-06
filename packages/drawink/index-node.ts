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

import { getDefaultAppState } from "./appState";
import { exportToCanvas } from "./scene/export";
import { createWriteStream } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// node-canvas 3.x is Bun compatible
// @ts-ignore - canvas types not installed, install with: npm install @types/canvas if needed
import { registerFont, createCanvas } from "canvas";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../../public");

const elements = [
  {
    id: "eVzaxG3YnHhqjEmD7NdYo",
    type: "diamond",
    x: 519,
    y: 199,
    width: 113,
    height: 115,
    strokeColor: "#000000",
    backgroundColor: "transparent",
    fillStyle: "hachure",
    strokeWidth: 1,
    roughness: 1,
    opacity: 100,
    seed: 749612521,
  },
  {
    id: "7W-iw5pEBPTU3eaCaLtFo",
    type: "ellipse",
    x: 552,
    y: 238,
    width: 49,
    height: 44,
    strokeColor: "#000000",
    backgroundColor: "transparent",
    fillStyle: "hachure",
    strokeWidth: 1,
    roughness: 1,
    opacity: 100,
    seed: 952056308,
  },
  {
    id: "kqKI231mvTrcsYo2DkUsR",
    type: "text",
    x: 557.5,
    y: 317.5,
    width: 43,
    height: 31,
    strokeColor: "#000000",
    backgroundColor: "transparent",
    fillStyle: "hachure",
    strokeWidth: 1,
    roughness: 1,
    opacity: 100,
    seed: 1683771448,
    text: "test",
    font: "20px Virgil",
    baseline: 22,
  },
];

registerFont(resolve(publicDir, "Virgil.woff2"), { family: "Virgil" });
registerFont(resolve(publicDir, "Cascadia.woff2"), { family: "Cascadia" });

const canvas = exportToCanvas(
  elements as any,
  {
    ...getDefaultAppState(),
    offsetTop: 0,
    offsetLeft: 0,
    width: 0,
    height: 0,
  },
  {}, // files
  {
    exportBackground: true,
    viewBackgroundColor: "#ffffff",
  },
  createCanvas,
);

const out = createWriteStream("test.png");
const stream = (canvas as any).createPNGStream();
stream.pipe(out);
out.on("finish", () => {
  console.info("test.png was created.");
});
