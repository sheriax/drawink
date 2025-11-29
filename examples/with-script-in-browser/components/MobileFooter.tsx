import React from "react";

import type * as TDrawink from "@drawink/drawink";
import type { DrawinkImperativeAPI } from "@drawink/drawink/types";

import CustomFooter from "./CustomFooter";

const MobileFooter = ({
  drawinkAPI,
  drawinkLib,
}: {
  drawinkAPI: DrawinkImperativeAPI;
  drawinkLib: typeof TDrawink;
}) => {
  const { useEditorInterface, Footer } = drawinkLib;

  const editorInterface = useEditorInterface();
  if (editorInterface.formFactor === "phone") {
    return (
      <Footer>
        <CustomFooter drawinkAPI={drawinkAPI} drawinkLib={drawinkLib} />
      </Footer>
    );
  }
  return null;
};
export default MobileFooter;
