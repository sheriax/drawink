import "csstype";

declare module "csstype" {
  interface Properties<TLength = string | number, TTime = string> {
    "--max-width"?: TLength;
    "--swatch-color"?: string;
    "--gap"?: TLength;
    "--padding"?: TLength;
  }
}
