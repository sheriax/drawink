import { nanoid } from "nanoid";
import {
  transformToExcalidrawArrowSkeleton,
  transformToExcalidrawContainerSkeleton,
  transformToExcalidrawLineSkeleton,
  transformToExcalidrawTextSkeleton,
} from "../transformToExcalidrawSkeleton.js";
import { GraphConverter } from "../GraphConverter.js";

import type { DrawinkElementSkeleton } from "@drawink/drawink/data/transform";
import type { Class } from "../../parser/class.js";

export const classToExcalidrawSkeletonConvertor = new GraphConverter({
  converter: (chart: Class) => {
    const elements: DrawinkElementSkeleton[] = [];

    Object.values(chart.nodes).forEach((node) => {
      if (!node || !node.length) {
        return;
      }
      node.forEach((element) => {
        let excalidrawElement: DrawinkElementSkeleton;

        switch (element.type) {
          case "line":
            excalidrawElement = transformToExcalidrawLineSkeleton(element);
            break;

          case "rectangle":
          case "ellipse":
            excalidrawElement = transformToExcalidrawContainerSkeleton(element);
            break;

          case "text":
            excalidrawElement = transformToExcalidrawTextSkeleton(element);
            break;
          default:
            throw `unknown type ${element.type}`;
            break;
        }
        elements.push(excalidrawElement);
      });
    });

    Object.values(chart.lines).forEach((line) => {
      if (!line) {
        return;
      }
      elements.push(transformToExcalidrawLineSkeleton(line));
    });

    Object.values(chart.arrows).forEach((arrow) => {
      if (!arrow) {
        return;
      }
      const excalidrawElement = transformToExcalidrawArrowSkeleton(arrow);
      elements.push(excalidrawElement);
    });

    Object.values(chart.text).forEach((ele) => {
      const excalidrawElement = transformToExcalidrawTextSkeleton(ele);

      elements.push(excalidrawElement);
    });

    Object.values(chart.namespaces).forEach((namespace) => {
      const classIds = Object.keys(namespace.classes);
      const children = [...classIds];
      const chartElements = [...chart.lines, ...chart.arrows, ...chart.text];
      classIds.forEach((classId) => {
        const childIds = chartElements
          .filter((ele) => ele.metadata && ele.metadata.classId === classId)
          .map((ele) => ele.id);

        if (childIds.length) {
          children.push(...(childIds as string[]));
        }
      });
      const frame: DrawinkElementSkeleton = {
        type: "frame",
        id: nanoid(),
        name: namespace.id,
        children,
      };
      elements.push(frame);
    });
    return { elements };
  },
});
