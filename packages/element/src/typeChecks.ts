import { ROUNDNESS, assertNever } from "@excalidraw/common";

import { pointsEqual } from "@excalidraw/math";

import type { ElementOrToolType } from "@drawink/drawink/types";

import type { MarkNonNullable } from "@excalidraw/common/utility-types";

import type { Bounds } from "./bounds";
import type {
  DrawinkElement,
  DrawinkTextElement,
  DrawinkEmbeddableElement,
  DrawinkLinearElement,
  DrawinkBindableElement,
  DrawinkFreeDrawElement,
  InitializedDrawinkImageElement,
  DrawinkImageElement,
  DrawinkTextElementWithContainer,
  DrawinkTextContainer,
  DrawinkFrameElement,
  RoundnessType,
  DrawinkFrameLikeElement,
  DrawinkElementType,
  DrawinkIframeElement,
  DrawinkIframeLikeElement,
  DrawinkMagicFrameElement,
  DrawinkArrowElement,
  DrawinkElbowArrowElement,
  DrawinkLineElement,
  DrawinkFlowchartNodeElement,
  DrawinkLinearElementSubType,
} from "./types";

export const isInitializedImageElement = (
  element: DrawinkElement | null,
): element is InitializedDrawinkImageElement => {
  return !!element && element.type === "image" && !!element.fileId;
};

export const isImageElement = (
  element: DrawinkElement | null,
): element is DrawinkImageElement => {
  return !!element && element.type === "image";
};

export const isEmbeddableElement = (
  element: DrawinkElement | null | undefined,
): element is DrawinkEmbeddableElement => {
  return !!element && element.type === "embeddable";
};

export const isIframeElement = (
  element: DrawinkElement | null,
): element is DrawinkIframeElement => {
  return !!element && element.type === "iframe";
};

export const isIframeLikeElement = (
  element: DrawinkElement | null,
): element is DrawinkIframeLikeElement => {
  return (
    !!element && (element.type === "iframe" || element.type === "embeddable")
  );
};

export const isTextElement = (
  element: DrawinkElement | null,
): element is DrawinkTextElement => {
  return element != null && element.type === "text";
};

export const isFrameElement = (
  element: DrawinkElement | null,
): element is DrawinkFrameElement => {
  return element != null && element.type === "frame";
};

export const isMagicFrameElement = (
  element: DrawinkElement | null,
): element is DrawinkMagicFrameElement => {
  return element != null && element.type === "magicframe";
};

export const isFrameLikeElement = (
  element: DrawinkElement | null,
): element is DrawinkFrameLikeElement => {
  return (
    element != null &&
    (element.type === "frame" || element.type === "magicframe")
  );
};

export const isFreeDrawElement = (
  element?: DrawinkElement | null,
): element is DrawinkFreeDrawElement => {
  return element != null && isFreeDrawElementType(element.type);
};

export const isFreeDrawElementType = (
  elementType: DrawinkElementType,
): boolean => {
  return elementType === "freedraw";
};

export const isLinearElement = (
  element?: DrawinkElement | null,
): element is DrawinkLinearElement => {
  return element != null && isLinearElementType(element.type);
};

export const isLineElement = (
  element?: DrawinkElement | null,
): element is DrawinkLineElement => {
  return element != null && element.type === "line";
};

export const isArrowElement = (
  element?: DrawinkElement | null,
): element is DrawinkArrowElement => {
  return element != null && element.type === "arrow";
};

export const isElbowArrow = (
  element?: DrawinkElement,
): element is DrawinkElbowArrowElement => {
  return isArrowElement(element) && element.elbowed;
};

/**
 * sharp or curved arrow, but not elbow
 */
export const isSimpleArrow = (
  element?: DrawinkElement,
): element is DrawinkArrowElement => {
  return isArrowElement(element) && !element.elbowed;
};

export const isSharpArrow = (
  element?: DrawinkElement,
): element is DrawinkArrowElement => {
  return isArrowElement(element) && !element.elbowed && !element.roundness;
};

export const isCurvedArrow = (
  element?: DrawinkElement,
): element is DrawinkArrowElement => {
  return (
    isArrowElement(element) && !element.elbowed && element.roundness !== null
  );
};

export const isLinearElementType = (
  elementType: ElementOrToolType,
): boolean => {
  return (
    elementType === "arrow" || elementType === "line" // || elementType === "freedraw"
  );
};

export const isBindingElement = (
  element?: DrawinkElement | null,
  includeLocked = true,
): element is DrawinkArrowElement => {
  return (
    element != null &&
    (!element.locked || includeLocked === true) &&
    isBindingElementType(element.type)
  );
};

export const isBindingElementType = (
  elementType: ElementOrToolType,
): boolean => {
  return elementType === "arrow";
};

export const isBindableElement = (
  element: DrawinkElement | null | undefined,
  includeLocked = true,
): element is DrawinkBindableElement => {
  return (
    element != null &&
    (!element.locked || includeLocked === true) &&
    (element.type === "rectangle" ||
      element.type === "diamond" ||
      element.type === "ellipse" ||
      element.type === "image" ||
      element.type === "iframe" ||
      element.type === "embeddable" ||
      element.type === "frame" ||
      element.type === "magicframe" ||
      (element.type === "text" && !element.containerId))
  );
};

export const isRectanguloidElement = (
  element?: DrawinkElement | null,
): element is DrawinkBindableElement => {
  return (
    element != null &&
    (element.type === "rectangle" ||
      element.type === "diamond" ||
      element.type === "image" ||
      element.type === "iframe" ||
      element.type === "embeddable" ||
      element.type === "frame" ||
      element.type === "magicframe" ||
      (element.type === "text" && !element.containerId))
  );
};

// TODO: Remove this when proper distance calculation is introduced
// @see binding.ts:distanceToBindableElement()
export const isRectangularElement = (
  element?: DrawinkElement | null,
): element is DrawinkBindableElement => {
  return (
    element != null &&
    (element.type === "rectangle" ||
      element.type === "image" ||
      element.type === "text" ||
      element.type === "iframe" ||
      element.type === "embeddable" ||
      element.type === "frame" ||
      element.type === "magicframe" ||
      element.type === "freedraw")
  );
};

export const isTextBindableContainer = (
  element: DrawinkElement | null,
  includeLocked = true,
): element is DrawinkTextContainer => {
  return (
    element != null &&
    (!element.locked || includeLocked === true) &&
    (element.type === "rectangle" ||
      element.type === "diamond" ||
      element.type === "ellipse" ||
      isArrowElement(element))
  );
};

export const isDrawinkElement = (
  element: any,
): element is DrawinkElement => {
  const type: DrawinkElementType | undefined = element?.type;
  if (!type) {
    return false;
  }
  switch (type) {
    case "text":
    case "diamond":
    case "rectangle":
    case "iframe":
    case "embeddable":
    case "ellipse":
    case "arrow":
    case "freedraw":
    case "line":
    case "frame":
    case "magicframe":
    case "image":
    case "selection": {
      return true;
    }
    default: {
      assertNever(type, null);
      return false;
    }
  }
};

export const isFlowchartNodeElement = (
  element: DrawinkElement,
): element is DrawinkFlowchartNodeElement => {
  return (
    element.type === "rectangle" ||
    element.type === "ellipse" ||
    element.type === "diamond"
  );
};

export const hasBoundTextElement = (
  element: DrawinkElement | null,
): element is MarkNonNullable<DrawinkBindableElement, "boundElements"> => {
  return (
    isTextBindableContainer(element) &&
    !!element.boundElements?.some(({ type }) => type === "text")
  );
};

export const isBoundToContainer = (
  element: DrawinkElement | null,
): element is DrawinkTextElementWithContainer => {
  return (
    element !== null &&
    "containerId" in element &&
    element.containerId !== null &&
    isTextElement(element)
  );
};

export const isArrowBoundToElement = (element: DrawinkArrowElement) => {
  return !!element.startBinding || !!element.endBinding;
};

export const isUsingAdaptiveRadius = (type: string) =>
  type === "rectangle" ||
  type === "embeddable" ||
  type === "iframe" ||
  type === "image";

export const isUsingProportionalRadius = (type: string) =>
  type === "line" || type === "arrow" || type === "diamond";

export const canApplyRoundnessTypeToElement = (
  roundnessType: RoundnessType,
  element: DrawinkElement,
) => {
  if (
    (roundnessType === ROUNDNESS.ADAPTIVE_RADIUS ||
      // if legacy roundness, it can be applied to elements that currently
      // use adaptive radius
      roundnessType === ROUNDNESS.LEGACY) &&
    isUsingAdaptiveRadius(element.type)
  ) {
    return true;
  }
  if (
    roundnessType === ROUNDNESS.PROPORTIONAL_RADIUS &&
    isUsingProportionalRadius(element.type)
  ) {
    return true;
  }

  return false;
};

export const getDefaultRoundnessTypeForElement = (
  element: DrawinkElement,
) => {
  if (isUsingProportionalRadius(element.type)) {
    return {
      type: ROUNDNESS.PROPORTIONAL_RADIUS,
    };
  }

  if (isUsingAdaptiveRadius(element.type)) {
    return {
      type: ROUNDNESS.ADAPTIVE_RADIUS,
    };
  }

  return null;
};

// TODO: Move this to @excalidraw/math
export const isBounds = (box: unknown): box is Bounds =>
  Array.isArray(box) &&
  box.length === 4 &&
  typeof box[0] === "number" &&
  typeof box[1] === "number" &&
  typeof box[2] === "number" &&
  typeof box[3] === "number";

export const getLinearElementSubType = (
  element: DrawinkLinearElement,
): DrawinkLinearElementSubType => {
  if (isSharpArrow(element)) {
    return "sharpArrow";
  }
  if (isCurvedArrow(element)) {
    return "curvedArrow";
  }
  if (isElbowArrow(element)) {
    return "elbowArrow";
  }
  return "line";
};

/**
 * Checks if current element points meet all the conditions for polygon=true
 * (this isn't a element type check, for that use isLineElement).
 *
 * If you want to check if points *can* be turned into a polygon, use
 *  canBecomePolygon(points).
 */
export const isValidPolygon = (
  points: DrawinkLineElement["points"],
): boolean => {
  return points.length > 3 && pointsEqual(points[0], points[points.length - 1]);
};

export const canBecomePolygon = (
  points: DrawinkLineElement["points"],
): boolean => {
  return (
    points.length > 3 ||
    // 3-point polygons can't have all points in a single line
    (points.length === 3 && !pointsEqual(points[0], points[points.length - 1]))
  );
};
