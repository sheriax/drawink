"use client";
import * as excalidrawLib from "@drawink/drawink";
import { Drawink } from "@drawink/drawink";

import "@drawink/drawink/index.css";

import App from "../../with-script-in-browser/components/ExampleApp";

const DrawinkWrapper: React.FC = () => {
  return (
    <>
      <App
        appTitle={"Drawink with Nextjs Example"}
        useCustom={(api: any, args?: any[]) => { }}
        excalidrawLib={excalidrawLib}
      >
        <Drawink />
      </App>
    </>
  );
};

export default DrawinkWrapper;
