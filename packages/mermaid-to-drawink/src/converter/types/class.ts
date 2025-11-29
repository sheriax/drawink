import { nanoid } from "nanoid";

import type { DrawinkElementSkeleton } from "@drawink/drawink/data/transform";

import {
  transformToDrawinkArrowSkeleton,
  transformToDrawinkContainerSkeleton,
  transformToDrawinkLineSkeleton,
  transformToDrawinkTextSkeleton,
} from "../transformToDrawinkSkeleton.js";
import { GraphConverter } from "../GraphConverter.js";

import type { Class } from "../../parser/class.js";

export const classToDrawinkSkeletonConvertor = new GraphConverter({
  converter: (chart: Class) => {
    const elements: DrawinkElementSkeleton[] = [];

    Object.values(chart.nodes).forEach((node) => {
      if (!node || !node.length) {
        return;
      }
      node.forEach((element) => {
        let drawinkElement: DrawinkElementSkeleton;

        switch (element.type) {
          case "line":
            drawinkElement = transformToDrawinkLineSkeleton(element);
            break;

          case "rectangle":
          case "ellipse":
            drawinkElement = transformToDrawinkContainerSkeleton(element);
            break;

          case "text":
            drawinkElement = transformToDrawinkTextSkeleton(element);
            break;
          default:
            throw `unknown type ${element.type}`;
            break;
        }
        elements.push(drawinkElement);
      });
    });

    Object.values(chart.lines).forEach((line) => {
      if (!line) {
        return;
      }
      elements.push(transformToDrawinkLineSkeleton(line));
    });

    Object.values(chart.arrows).forEach((arrow) => {
      if (!arrow) {
        return;
      }
      const drawinkElement = transformToDrawinkArrowSkeleton(arrow);
      elements.push(drawinkElement);
    });

    Object.values(chart.text).forEach((ele) => {
      const drawinkElement = transformToDrawinkTextSkeleton(ele);

      elements.push(drawinkElement);
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
