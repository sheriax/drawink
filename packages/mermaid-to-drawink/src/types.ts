import type { ImportedDataState } from "@drawink/drawink/data/types";
import type {
  DrawinkRectangleElement,
  DrawinkDiamondElement,
  DrawinkEllipseElement,
} from "@drawink/drawink/element/types";

// Utility type to make readonly properties mutable
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

export type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;

export type DrawinkElement = Mutable<
  ArrayElement<ImportedDataState["elements"]>
>;

export type DrawinkVertexElement =
  | DrawinkRectangleElement
  | DrawinkDiamondElement
  | DrawinkEllipseElement;
