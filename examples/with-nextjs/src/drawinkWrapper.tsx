"use client";
import * as drawinkLib from "@/core";
import { Drawink } from "@/core";

import "@/core/index.css";

import App from "../../with-script-in-browser/components/ExampleApp";

const DrawinkWrapper: React.FC = () => {
  return (
    <>
      <App
        appTitle={"Drawink with Nextjs Example"}
        useCustom={(api: any, args?: any[]) => {}}
        drawinkLib={drawinkLib}
      >
        <Drawink />
      </App>
    </>
  );
};

export default DrawinkWrapper;
