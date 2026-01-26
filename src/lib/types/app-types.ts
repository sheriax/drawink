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

// Grid size type (nullable)
export type NullableGridSize = (number & { _brand: "NullableGridSize" }) | null;

// App-specific tool type with additional state
// This is an intersection of ActiveTool and additional state properties
export type AppActiveTool = {
  lastActiveTool: ActiveTool | null;
  locked: boolean;
  fromSelection: boolean;
} & ActiveTool;

// Arrow type for current item
export type AppCurrentItemArrowType = "sharp" | "round" | "elbow";

// UI Options type
export type AppUIOptions = {
  canvasActions: {
    changeViewBackgroundColor: boolean;
    clearCanvas: boolean;
    export: { saveFileToDisk: boolean } | false;
    loadScene: boolean;
    saveToActiveFile: boolean;
    toggleTheme: boolean | null;
    saveAsImage: boolean;
  };
  tools: {
    image: boolean;
  };
  dockedSidebarBreakpoint?: number;
  formFactor?: "desktop" | "mobile";
  desktopUIMode?: "full" | "minimal";
};

// Minimal AppState interface with only the fields needed by common package
// The full AppState is defined in @drawink/drawink/types
export interface AppState {
  activeTool: AppActiveTool;
  currentItemArrowType: AppCurrentItemArrowType;
  // Add other fields as needed
}

// Minimal AppProps type with only the fields needed by common package
// The full AppProps is defined in @drawink/drawink/types
export interface AppProps {
  UIOptions: AppUIOptions;
  // Add other fields as needed
}
