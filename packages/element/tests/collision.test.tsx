import { type GlobalPoint, type LocalPoint, pointFrom } from "@excalidraw/math";
import { Drawink } from "@drawink/drawink";
import { UI } from "@drawink/drawink/tests/helpers/ui";
import "@excalidraw/utils/test-utils";
import { render } from "@drawink/drawink/tests/test-utils";

import { hitElementItself } from "../src/collision";

describe("check rotated elements can be hit:", () => {
  beforeEach(async () => {
    localStorage.clear();
    await render(<Drawink handleKeyboardGlobally={true} />);
  });

  it("arrow", () => {
    UI.createElement("arrow", {
      x: 0,
      y: 0,
      width: 124,
      height: 302,
      angle: 1.8700426423973724,
      points: [
        [0, 0],
        [120, -198],
        [-4, -302],
      ] as LocalPoint[],
    });
    //const p = [120, -211];
    //const p = [0, 13];
    const hit = hitElementItself({
      point: pointFrom<GlobalPoint>(88, -68),
      element: window.h.elements[0],
      threshold: 10,
      elementsMap: window.h.scene.getNonDeletedElementsMap(),
    });
    expect(hit).toBe(true);
  });
});
