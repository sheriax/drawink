import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@/core/index.css";

import type * as TDrawink from "@/core";

import App from "./components/ExampleApp";

declare global {
  interface Window {
    DrawinkLib: typeof TDrawink;
  }
}

const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);
const { Drawink } = window.DrawinkLib;
root.render(
  <StrictMode>
    <App
      appTitle={"Drawink Example"}
      useCustom={(api: any, args?: any[]) => {}}
      drawinkLib={window.DrawinkLib}
    >
      <Drawink />
    </App>
  </StrictMode>,
);
