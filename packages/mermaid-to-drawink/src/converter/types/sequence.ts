import { nanoid } from "nanoid";

import type { DrawinkElementSkeleton } from "@drawink/drawink/data/transform";

import { GraphConverter } from "../GraphConverter.js";

import {
  transformToDrawinkLineSkeleton,
  transformToDrawinkTextSkeleton,
  transformToDrawinkContainerSkeleton,
  transformToDrawinkArrowSkeleton,
} from "../transformToDrawinkSkeleton.js";

import type { Sequence } from "../../parser/sequence.js";

import type { DrawinkElement } from "../../types.js";

export const SequenceToDrawinkSkeletonConvertor = new GraphConverter({
  converter: (chart: Sequence) => {
    const elements: DrawinkElementSkeleton[] = [];
    const activations: DrawinkElementSkeleton[] = [];
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
        if (element.type === "rectangle" && element?.subtype === "activation") {
          activations.push(drawinkElement);
        } else {
          elements.push(drawinkElement);
        }
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

      elements.push(transformToDrawinkArrowSkeleton(arrow));
      if (arrow.sequenceNumber) {
        elements.push(
          transformToDrawinkContainerSkeleton(arrow.sequenceNumber),
        );
      }
    });
    elements.push(...activations);

    // loops
    if (chart.loops) {
      const { lines, texts, nodes } = chart.loops;
      lines.forEach((line) => {
        elements.push(transformToDrawinkLineSkeleton(line));
      });
      texts.forEach((text) => {
        elements.push(transformToDrawinkTextSkeleton(text));
      });
      nodes.forEach((node) => {
        elements.push(transformToDrawinkContainerSkeleton(node));
      });
    }

    if (chart.groups) {
      chart.groups.forEach((group) => {
        const { actorKeys, name } = group;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = 0;
        let maxY = 0;
        if (!actorKeys.length) {
          return;
        }
        const actors = elements.filter((ele) => {
          if (ele.id) {
            const hyphenIndex = ele.id.indexOf("-");
            const id = ele.id.substring(0, hyphenIndex);
            return actorKeys.includes(id);
          }
        });
        actors.forEach((actor) => {
          if (
            actor.x === undefined ||
            actor.y === undefined ||
            actor.width === undefined ||
            actor.height === undefined
          ) {
            throw new Error(`Actor attributes missing ${actor}`);
          }
          minX = Math.min(minX, actor.x);
          minY = Math.min(minY, actor.y);
          maxX = Math.max(maxX, actor.x + actor.width);
          maxY = Math.max(maxY, actor.y + actor.height);
        });
        // Draw the outer rectangle enclosing the group elements
        const PADDING = 10;
        const groupRectX = minX - PADDING;
        const groupRectY = minY - PADDING;
        const groupRectWidth = maxX - minX + PADDING * 2;
        const groupRectHeight = maxY - minY + PADDING * 2;
        const groupRectId = nanoid();
        const groupRect = transformToDrawinkContainerSkeleton({
          type: "rectangle",
          x: groupRectX,
          y: groupRectY,
          width: groupRectWidth,
          height: groupRectHeight,
          bgColor: group.fill,
          id: groupRectId,
        });
        elements.unshift(groupRect);
        const frameId = nanoid();

        const frameChildren: DrawinkElement["id"][] = [groupRectId];

        elements.forEach((ele) => {
          if (ele.type === "frame") {
            return;
          }
          if (
            ele.x === undefined ||
            ele.y === undefined ||
            ele.width === undefined ||
            ele.height === undefined
          ) {
            throw new Error(`Element attributes missing ${ele}`);
          }
          if (
            ele.x >= minX &&
            ele.x + ele.width <= maxX &&
            ele.y >= minY &&
            ele.y + ele.height <= maxY
          ) {
            const elementId = ele.id || nanoid();
            if (!ele.id) {
              Object.assign(ele, { id: elementId });
            }
            frameChildren.push(elementId);
          }
        });

        const frame: DrawinkElementSkeleton = {
          type: "frame",
          id: frameId,
          name,
          children: frameChildren,
        };
        elements.push(frame);
      });
    }
    return { elements };
  },
});
