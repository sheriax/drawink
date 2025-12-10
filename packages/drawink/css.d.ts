import "csstype";

declare module "csstype" {
  interface Properties {
    // Allow any CSS custom property (CSS variables)
    [key: `--${string}`]: string | number | undefined;
  }
}

export { };
