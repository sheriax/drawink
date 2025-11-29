import * as MermaidToDrawink from "@excalidraw/mermaid-to-excalidraw";
import React from "react";
import { vi } from "vitest";

import type { parseMermaidToDrawink } from "@excalidraw/mermaid-to-excalidraw";

export const mockMermaidToDrawink = (opts: {
  parseMermaidToDrawink: typeof parseMermaidToDrawink;
  mockRef?: boolean;
}) => {
  vi.mock("@excalidraw/mermaid-to-excalidraw", async (importActual) => {
    const module = (await importActual()) as any;

    return {
      __esModule: true,
      ...module,
    };
  });
  const parseMermaidToDrawinkSpy = vi.spyOn(
    MermaidToDrawink,
    "parseMermaidToDrawink",
  );

  parseMermaidToDrawinkSpy.mockImplementation(opts.parseMermaidToDrawink);

  if (opts.mockRef) {
    vi.spyOn(React, "useRef").mockReturnValue({
      current: {
        parseMermaidToDrawink: parseMermaidToDrawinkSpy,
      },
    });
  }
};

// Mock for HTMLImageElement (use with `vi.unstubAllGlobals()`)
// as jsdom.resources: "usable" throws an error on image load
export const mockHTMLImageElement = (
  naturalWidth: number,
  naturalHeight: number,
) => {
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
export const mockMultipleHTMLImageElements = (
  sizes: (readonly [number, number])[],
) => {
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
