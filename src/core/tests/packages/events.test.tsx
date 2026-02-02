import { vi } from "vitest";

import { resolvablePromise } from "@/lib/common";

import { CaptureUpdateAction, Drawink } from "../../index";
import { API } from "../helpers/api";
import { Pointer } from "../helpers/ui";
import { render } from "../test-utils";

import type { DrawinkImperativeAPI } from "../../types";

describe("event callbacks", () => {
  const h = window.h;

  let drawinkAPI: DrawinkImperativeAPI;

  const mouse = new Pointer("mouse");

  beforeEach(async () => {
    const drawinkAPIPromise = resolvablePromise<DrawinkImperativeAPI>();
    await render(<Drawink drawinkAPI={(api) => drawinkAPIPromise.resolve(api as any)} />);
    drawinkAPI = await drawinkAPIPromise;
  });

  it("should trigger onChange on render", async () => {
    const onChange = vi.fn();

    const origBackgroundColor = h.state.viewBackgroundColor;
    drawinkAPI.onChange(onChange);
    API.updateScene({
      appState: { viewBackgroundColor: "red" },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    expect(onChange).toHaveBeenCalledWith(
      // elements
      [],
      // appState
      expect.objectContaining({
        viewBackgroundColor: "red",
      }),
      // files
      {},
    );
    expect(onChange.mock?.lastCall?.[1].viewBackgroundColor).not.toBe(origBackgroundColor);
  });

  it("should trigger onPointerDown/onPointerUp on canvas pointerDown/pointerUp", async () => {
    const onPointerDown = vi.fn();
    const onPointerUp = vi.fn();

    drawinkAPI.onPointerDown(onPointerDown);
    drawinkAPI.onPointerUp(onPointerUp);

    mouse.downAt(100);
    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(onPointerUp).not.toHaveBeenCalled();
    mouse.up();
    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(onPointerUp).toHaveBeenCalledTimes(1);
  });
});
