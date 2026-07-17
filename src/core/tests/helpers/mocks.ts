import React from "react";
import { vi } from "vitest";

import type { parseMermaidToExcalidraw } from "@drawink/mermaid-to-drawink";

const mermaidMocks = vi.hoisted(() => ({
  parseMermaidToExcalidraw: vi.fn(),
}));

vi.mock("@drawink/mermaid-to-drawink", async (importOriginal) => {
  const module = await importOriginal<typeof import("@drawink/mermaid-to-drawink")>();
  return {
    ...module,
    parseMermaidToExcalidraw: mermaidMocks.parseMermaidToExcalidraw,
  };
});

export const mockMermaidToDrawink = (opts: {
  parseMermaidToExcalidraw: typeof parseMermaidToExcalidraw;
  mockRef?: boolean;
}) => {
  const parseMermaidToDrawinkSpy = mermaidMocks.parseMermaidToExcalidraw.mockImplementation(
    opts.parseMermaidToExcalidraw,
  );

  if (opts.mockRef) {
    vi.spyOn(React, "useRef").mockReturnValue({
      current: {
        parseMermaidToExcalidraw: parseMermaidToDrawinkSpy,
      },
    });
  }
};

// Mock for HTMLImageElement (use with `vi.unstubAllGlobals()`)
// as jsdom.resources: "usable" throws an error on image load
export const mockHTMLImageElement = (naturalWidth: number, naturalHeight: number) => {
  vi.stubGlobal(
    "Image",
    class extends Image {
      constructor() {
        super();

        Object.defineProperty(this, "naturalWidth", {
          value: naturalWidth,
        });
        Object.defineProperty(this, "naturalHeight", {
          value: naturalHeight,
        });

        queueMicrotask(() => {
          this.onload?.({} as Event);
        });
      }
    },
  );
};

// Mocks for multiple HTMLImageElements (dimensions are assigned in the order of image initialization)
export const mockMultipleHTMLImageElements = (sizes: (readonly [number, number])[]) => {
  const _sizes = [...sizes];

  vi.stubGlobal(
    "Image",
    class extends Image {
      constructor() {
        super();

        const size = _sizes.shift();
        if (!size) {
          throw new Error("Insufficient sizes");
        }

        Object.defineProperty(this, "naturalWidth", {
          value: size[0],
        });
        Object.defineProperty(this, "naturalHeight", {
          value: size[1],
        });

        queueMicrotask(() => {
          this.onload?.({} as Event);
        });
      }
    },
  );
};
