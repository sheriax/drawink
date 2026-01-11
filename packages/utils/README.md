# @drawink/utils

## Install

```bash
npm install @drawink/utils
```

If you prefer Yarn over npm, use this command to install the Drawink utils package:

```bash
yarn add @drawink/utils
```

## API

### `serializeAsJSON`

See [`serializeAsJSON`](https://github.com/drawink/drawink/blob/master/src/packages/drawink/README.md#serializeAsJSON) for API and description.

### `exportToBlob` (async)

Export an Drawink diagram to a [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob).

### `exportToSvg`

Export an Drawink diagram to a [SVGElement](https://developer.mozilla.org/en-US/docs/Web/API/SVGElement).

## Usage

Drawink utils is published as a UMD (Universal Module Definition). If you are using a module bundler (for instance, Webpack), you can import it as an ES6 module:

```js
import { exportToSvg, exportToBlob } from "@drawink/utils";
```

To use it in a browser directly:

```html
<script src="https://unpkg.com/@drawink/utils@0.1.0/dist/drawink-utils.min.js"></script>
<script>
  // DrawinkUtils is a global variable defined by drawink.min.js
  const { exportToSvg, exportToBlob } = DrawinkUtils;
</script>
```

Here's the `exportToBlob` and `exportToSvg` functions in action:

```js
const drawinkDiagram = {
  type: "drawink",
  version: 2,
  source: "https://drawink.app",
  elements: [
    {
      id: "vWrqOAfkind2qcm7LDAGZ",
      type: "ellipse",
      x: 414,
      y: 237,
      width: 214,
      height: 214,
      angle: 0,
      strokeColor: "#000000",
      backgroundColor: "#15aabf",
      fillStyle: "hachure",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      roundness: null,
      seed: 1041657908,
      version: 120,
      versionNonce: 1188004276,
      isDeleted: false,
      boundElementIds: null,
    },
  ],
  appState: {
    viewBackgroundColor: "#ffffff",
    gridSize: null,
  },
};

// Export the Drawink diagram as SVG string
const svg = exportToSvg(drawinkDiagram);
console.log(svg.outerHTML);

// Export the Drawink diagram as PNG Blob URL
(async () => {
  const blob = await exportToBlob({
    ...drawinkDiagram,
    mimeType: "image/png",
  });

  const urlCreator = window.URL || window.webkitURL;
  console.log(urlCreator.createObjectURL(blob));
})();
```
