import { DEFAULT_FONT_FAMILY } from "@drawink/common";

import type { Radians } from "@drawink/math";

import type { DrawinkElement } from "@drawink/element/types";

const elementBase: Omit<DrawinkElement, "type"> = {
  id: "vWrqOAfkind2qcm7LDAGZ",
  x: 414,
  y: 237,
  width: 214,
  height: 214,
  angle: 0 as Radians,
  strokeColor: "#000000",
  backgroundColor: "#15aabf",
  fillStyle: "hachure",
  strokeWidth: 1,
  strokeStyle: "solid",
  roughness: 1,
  opacity: 100,
  groupIds: [],
  frameId: null,
  roundness: null,
  index: null,
  seed: 1041657908,
  version: 120,
  versionNonce: 1188004276,
  isDeleted: false,
  boundElements: null,
  updated: 1,
  link: null,
  locked: false,
};

export const rectangleFixture: DrawinkElement = {
  ...elementBase,
  type: "rectangle",
};
export const embeddableFixture: DrawinkElement = {
  ...elementBase,
  type: "embeddable",
};
export const ellipseFixture: DrawinkElement = {
  ...elementBase,
  type: "ellipse",
};
export const diamondFixture: DrawinkElement = {
  ...elementBase,
  type: "diamond",
};
export const rectangleWithLinkFixture: DrawinkElement = {
  ...elementBase,
  type: "rectangle",
  link: "drawink.com",
};

export const textFixture: DrawinkElement = {
  ...elementBase,
  type: "text",
  fontSize: 20,
  fontFamily: DEFAULT_FONT_FAMILY,
  text: "original text",
  originalText: "original text",
  textAlign: "left",
  verticalAlign: "top",
  containerId: null,
  lineHeight: 1.25 as any,
  autoResize: false,
};
