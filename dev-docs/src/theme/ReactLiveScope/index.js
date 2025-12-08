import React from "react";
import ExecutionEnvironment from "@docusaurus/ExecutionEnvironment";
import initialData from "@site/src/initialData";
import { useColorMode } from "@docusaurus/theme-common";

import "@drawink/drawink/index.css";

let DrawinkComp = {};
if (ExecutionEnvironment.canUseDOM) {
  DrawinkComp = require("@drawink/drawink");
}
const Drawink = React.forwardRef((props, ref) => {
  if (!window.EXCALIDRAW_ASSET_PATH) {
    window.EXCALIDRAW_ASSET_PATH =
      "https://esm.sh/@drawink/drawink@0.18.0/dist/prod/";
  }

  const { colorMode } = useColorMode();
  return <DrawinkComp.Drawink theme={colorMode} {...props} ref={ref} />;
});
// Add react-live imports you need here
const DrawinkScope = {
  React,
  ...React,
  Drawink,
  Footer: DrawinkComp.Footer,
  useDevice: DrawinkComp.useDevice,
  MainMenu: DrawinkComp.MainMenu,
  WelcomeScreen: DrawinkComp.WelcomeScreen,
  LiveCollaborationTrigger: DrawinkComp.LiveCollaborationTrigger,
  Sidebar: DrawinkComp.Sidebar,
  exportToCanvas: DrawinkComp.exportToCanvas,
  initialData,
  useI18n: DrawinkComp.useI18n,
  convertToDrawinkElements: DrawinkComp.convertToDrawinkElements,
  CaptureUpdateAction: DrawinkComp.CaptureUpdateAction,
};

export default DrawinkScope;
