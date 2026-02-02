// Browser globals polyfills for Node/Bun environment
// This file must be loaded BEFORE any code that references browser globals

(globalThis as any).devicePixelRatio = 1;
(globalThis as any).window = globalThis;
(globalThis as any).document = {
  createElement: () => ({
    getContext: () => null,
    style: {},
    setAttribute: () => {},
    appendChild: () => {},
    classList: { add: () => {}, remove: () => {} },
  }),
  body: { appendChild: () => {}, removeChild: () => {} },
  head: { appendChild: () => {}, style: {} },
  documentElement: { style: {} },
  createTextNode: () => ({}),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
};
(globalThis as any).navigator = {
  userAgent: "node",
  platform: "node",
  language: "en",
  clipboard: { writeText: async () => {} },
};
(globalThis as any).matchMedia = () => ({
  matches: false,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
});
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
(globalThis as any).MutationObserver = class MutationObserver {
  observe() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
};
(globalThis as any).requestAnimationFrame = (cb: () => void) => setTimeout(cb, 16);
(globalThis as any).cancelAnimationFrame = clearTimeout;
(globalThis as any).HTMLCanvasElement = class HTMLCanvasElement {};
(globalThis as any).HTMLImageElement = class HTMLImageElement {};
(globalThis as any).Image = class Image {
  onload: (() => void) | null = null;
  onerror: ((e: Error) => void) | null = null;
  src = "";
  width = 0;
  height = 0;
};
(globalThis as any).URL =
  globalThis.URL ??
  class URL {
    constructor(public href: string) {}
    static createObjectURL() {
      return "";
    }
    static revokeObjectURL() {}
  };
(globalThis as any).Blob = globalThis.Blob ?? class Blob {};
(globalThis as any).FileReader = class FileReader {
  onload: (() => void) | null = null;
  result: string | null = null;
  readAsDataURL() {}
  readAsText() {}
  readAsArrayBuffer() {}
};
(globalThis as any).fetch =
  globalThis.fetch ?? (() => Promise.resolve({ ok: true, json: () => ({}) }));

console.log("✅ Browser polyfills loaded");
