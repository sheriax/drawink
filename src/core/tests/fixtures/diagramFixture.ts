import { VERSIONS } from "@/lib/common";

import { diamondFixture, ellipseFixture, rectangleFixture } from "./elementFixture";

export const diagramFixture = {
  type: "drawink",
  version: VERSIONS.drawink,
  source: "https://drawink.app",
  elements: [diamondFixture, ellipseFixture, rectangleFixture],
  appState: {
    viewBackgroundColor: "#ffffff",
    gridModeEnabled: false,
  },
  files: {},
};

export const diagramFactory = ({ overrides = {}, elementOverrides = {} } = {}) => ({
  ...diagramFixture,
  elements: [
    { ...diamondFixture, ...elementOverrides },
    { ...ellipseFixture, ...elementOverrides },
    { ...rectangleFixture, ...elementOverrides },
  ],
  ...overrides,
});

export default diagramFixture;
