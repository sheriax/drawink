import { resolvablePromise } from "@/lib/common";

import { Drawink } from "../index";

import { Pointer } from "./helpers/ui";
import { act, render } from "./test-utils";

import type { DrawinkImperativeAPI } from "../types";

describe("setActiveTool()", () => {
  const h = window.h;

  let drawinkAPI: DrawinkImperativeAPI;

  const mouse = new Pointer("mouse");

  beforeEach(async () => {
    const drawinkAPIPromise = resolvablePromise<DrawinkImperativeAPI>();
    await render(<Drawink drawinkAPI={(api) => drawinkAPIPromise.resolve(api as any)} />);
    drawinkAPI = await drawinkAPIPromise;
  });

  it("should expose setActiveTool on package API", () => {
    expect(drawinkAPI.setActiveTool).toBeDefined();
    expect(drawinkAPI.setActiveTool).toBe(h.app.setActiveTool);
  });

  it("should set the active tool type", async () => {
    expect(h.state.activeTool.type).toBe("selection");
    act(() => {
      drawinkAPI.setActiveTool({ type: "rectangle" });
    });
    expect(h.state.activeTool.type).toBe("rectangle");

    mouse.down(10, 10);
    mouse.up(20, 20);

    expect(h.state.activeTool.type).toBe("selection");
  });

  it("should support tool locking", async () => {
    expect(h.state.activeTool.type).toBe("selection");
    act(() => {
      drawinkAPI.setActiveTool({ type: "rectangle", locked: true });
    });
    expect(h.state.activeTool.type).toBe("rectangle");

    mouse.down(10, 10);
    mouse.up(20, 20);

    expect(h.state.activeTool.type).toBe("rectangle");
  });

  it("should set custom tool", async () => {
    expect(h.state.activeTool.type).toBe("selection");
    act(() => {
      drawinkAPI.setActiveTool({ type: "custom", customType: "comment" });
    });
    expect(h.state.activeTool.type).toBe("custom");
    expect(h.state.activeTool.customType).toBe("comment");
  });
});
