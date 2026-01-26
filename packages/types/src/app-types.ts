/**
 * Shared application types used across packages
 * These types are extracted from @drawink/drawink to avoid circular dependencies
 */

// Branded number type for normalized zoom values
export type NormalizedZoomValue = number & { _brand: "normalizedZoom" };

// Zoom state
export type Zoom = Readonly<{
  value: NormalizedZoomValue;
}>;

// Tool types
export type ToolType =
  | "selection"
  | "lasso"
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "arrow"
  | "line"
  | "freedraw"
  | "text"
  | "image"
  | "eraser"
  | "hand"
  | "frame"
  | "magicframe"
  | "embeddable"
  | "laser";

export type ActiveTool =
  | {
      type: ToolType;
      customType: null;
    }
  | {
      type: "custom";
      customType: string;
    };

// Simple callback type
export type UnsubscribeCallback = () => void;
