import {
  Arrowhead,
  DrawinkTextElement,
} from "@drawink/drawink/element/types";
import {
  CONTAINER_STYLE_PROPERTY,
  LABEL_STYLE_PROPERTY,
  SubGraph,
  Vertex,
} from "../interfaces.js";
import { DrawinkVertexElement, Mutable } from "../types.js";
import { removeMarkdown } from "@drawink/markdown-to-text";
import { Edge } from "../parser/flowchart.js";

/**
 * Compute groupIds for each element
 */
export interface ArrowType {
  startArrowhead?: Arrowhead | null;
  endArrowhead?: Arrowhead | null;
}
/**
 * Convert mermaid edge type to Drawink arrow type
 */
const MERMAID_EDGE_TYPE_MAPPER: { [key: string]: ArrowType } = {
  arrow_circle: {
    endArrowhead: "dot",
  },
  arrow_cross: {
    endArrowhead: "bar",
  },
  arrow_open: {
    endArrowhead: null,
    startArrowhead: null,
  },
  double_arrow_circle: {
    endArrowhead: "dot",
    startArrowhead: "dot",
  },
  double_arrow_cross: {
    endArrowhead: "bar",
    startArrowhead: "bar",
  },
  double_arrow_point: {
    endArrowhead: "arrow",
    startArrowhead: "arrow",
  },
};

export const computeDrawinkArrowType = (
  mermaidArrowType: string
): ArrowType => {
  return MERMAID_EDGE_TYPE_MAPPER[mermaidArrowType];
};

// Get text from graph elements, fallback markdown to text
export const getText = (element: Vertex | Edge | SubGraph): string => {
  let text = element.text;
  if (element.labelType === "markdown") {
    text = removeMarkdown(element.text);
  }

  return removeFontAwesomeIcons(text);
};

/**
 * Remove font awesome icons support from text
 */
const removeFontAwesomeIcons = (input: string): string => {
  const fontAwesomeRegex = /\s?(fa|fab):[a-zA-Z0-9-]+/g;
  return input.replace(fontAwesomeRegex, "");
};

/**
 * Compute style for vertex
 */
export const computeDrawinkVertexStyle = (
  style: Vertex["containerStyle"]
): Partial<Mutable<DrawinkVertexElement>> => {
  const drawinkProperty: Partial<Mutable<DrawinkVertexElement>> = {};
  Object.keys(style).forEach((property) => {
    switch (property) {
      case CONTAINER_STYLE_PROPERTY.FILL: {
        drawinkProperty.backgroundColor = style[property];
        drawinkProperty.fillStyle = "solid";
        break;
      }
      case CONTAINER_STYLE_PROPERTY.STROKE: {
        drawinkProperty.strokeColor = style[property];
        break;
      }
      case CONTAINER_STYLE_PROPERTY.STROKE_WIDTH: {
        drawinkProperty.strokeWidth = Number(
          style[property]?.split("px")[0]
        );
        break;
      }
      case CONTAINER_STYLE_PROPERTY.STROKE_DASHARRAY: {
        drawinkProperty.strokeStyle = "dashed";
        break;
      }
    }
  });
  return drawinkProperty;
};

/**
 * Compute style for label
 */
export const computeDrawinkVertexLabelStyle = (
  style: Vertex["labelStyle"]
): Partial<Mutable<DrawinkTextElement>> => {
  const drawinkProperty: Partial<Mutable<DrawinkTextElement>> = {};
  Object.keys(style).forEach((property) => {
    switch (property) {
      case LABEL_STYLE_PROPERTY.COLOR: {
        drawinkProperty.strokeColor = style[property];
        break;
      }
    }
  });
  return drawinkProperty;
};
