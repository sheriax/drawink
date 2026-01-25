---
slug: /@drawink/drawink/api/utils
---

# Utils

These are pure Javascript functions exported from the @drawink/drawink [`@drawink/drawink`](https://npmjs.com/@drawink/drawink). If you want to export your drawings in different formats eg `png`, `svg` and more you can check out [Export Utilities](/docs/@drawink/drawink/API/utils/export). If you want to restore your drawings you can check out [Restore Utilities](/docs/@drawink/drawink/API/utils/restore).

### serializeAsJSON

Takes the scene elements and state and returns a JSON string. `Deleted` elements as well as most properties from `AppState` are removed from the resulting JSON. (see [`serializeAsJSON()`](https://github.com/drawink/drawink/blob/master/packages/drawink/data/json.ts#L42) source for details).

If you want to overwrite the `source` field in the `JSON` string, you can set `window.EXCALIDRAW_EXPORT_SOURCE` to the desired value.

**_Signature_**

<pre>
serializeAsJSON(&#123;<br/>&nbsp;
  elements: <a href="https://github.com/drawink/drawink/blob/master/packages/drawink/element/types.ts#L114">DrawinkElement[]</a>,<br/>&nbsp;
  appState: <a href="https://github.com/drawink/drawink/blob/master/packages/drawink/types.ts#L95">AppState</a>,<br/>
}): string
</pre>

**How to use**

```js
import { serializeAsJSON } from "@drawink/drawink";
```

### serializeLibraryAsJSON

Takes the `library` items and returns a `JSON` string.

If you want to overwrite the source field in the JSON string, you can set `window.EXCALIDRAW_EXPORT_SOURCE` to the desired value.

**_Signature_**

<pre>
serializeLibraryAsJSON(
  libraryItems: <a href="https://github.com/drawink/drawink/blob/master/packages/drawink/types.ts#L200">LibraryItems[]</a>)
</pre>

**How to use**

```js
import { serializeLibraryAsJSON } from "@drawink/drawink";
```

#### isInvisiblySmallElement

Returns `true` if element is invisibly small (e.g. width & height are zero).

**_Signature_**

<pre>
isInvisiblySmallElement(element:  <a href="https://github.com/drawink/drawink/blob/master/packages/drawink/element/types.ts#L114">DrawinkElement</a>): boolean
</pre>

**How to use**

```js
import { isInvisiblySmallElement } from "@drawink/drawink";
```

### loadFromBlob

This function loads the scene data from the blob (or file). If you pass `localAppState`, `localAppState` value will be preferred over the `appState` derived from `blob`. Throws if blob doesn't contain valid scene data.

**How to use**

```js
import { loadFromBlob } from "@drawink/drawink";

const scene = await loadFromBlob(file, null, null);
drawinkAPI.updateScene(scene);
```

**Signature**

<pre>
loadFromBlob(<br/>&nbsp;
  blob: <a href="https://developer.mozilla.org/en-US/docs/Web/API/Blob">Blob</a>,<br/>&nbsp;
  localAppState: <a href="https://github.com/drawink/drawink/blob/master/packages/drawink/types.ts#L95">AppState</a> | null,<br/>&nbsp;
  localElements: <a href="https://github.com/drawink/drawink/blob/master/packages/drawink/element/types.ts#L114">DrawinkElement[]</a> | null,<br/>&nbsp;
  fileHandle?: FileSystemHandle | null <br/>
) => Promise&lt;<a href="https://github.com/drawink/drawink/blob/master/packages/drawink/data/restore.ts#L61">RestoredDataState</a>>
</pre>

### loadLibraryFromBlob

This function loads the library from the blob. Additonally takes `defaultStatus` param which sets the default status for library item if not present, defaults to `unpublished`.

**How to use **

```js
import { loadLibraryFromBlob } from "@drawink/drawink";
```

**_Signature_**

<pre>
loadLibraryFromBlob(blob: <a href="https://developer.mozilla.org/en-US/docs/Web/API/Blob">Blob</a>, defaultStatus: "published" | "unpublished")
</pre>

### loadSceneOrLibraryFromBlob

This function loads either scene or library data from the supplied blob. If the blob contains scene data, and you pass `localAppState`, `localAppState` value will be preferred over the `appState` derived from `blob`.

:::caution

Throws if blob doesn't contain valid `scene` data or `library` data.

:::

**How to use**

```js showLineNumbers
import { loadSceneOrLibraryFromBlob, MIME_TYPES } from "@drawink/drawink";

const contents = await loadSceneOrLibraryFromBlob(file, null, null);
if (contents.type === MIME_TYPES.drawink) {
  drawinkAPI.updateScene(contents.data);
} else if (contents.type === MIME_TYPES.drawinklib) {
  drawinkAPI.updateLibrary(contents.data);
}
```

**_Signature_**

<pre>
loadSceneOrLibraryFromBlob(<br/>&nbsp;
  blob: <a href="https://developer.mozilla.org/en-US/docs/Web/API/Blob">Blob</a>,<br/>&nbsp;
  localAppState: <a href="https://github.com/drawink/drawink/blob/master/packages/drawink/types.ts#L95">AppState</a> | null,<br/>&nbsp;
  localElements: <a href="https://github.com/drawink/drawink/blob/master/packages/drawink/element/types.ts#L114">DrawinkElement[]</a> | null,<br/>&nbsp;
  fileHandle?: FileSystemHandle | null<br/>
) => Promise&lt;&#123; type: string, data: <a href="https://github.com/drawink/drawink/blob/master/packages/drawink/data/restore.ts#L53">RestoredDataState</a> | <a href="https://github.com/drawink/drawink/blob/master/packages/drawink/data/types.ts#L33">ImportedLibraryState</a>}>
</pre>

### getFreeDrawSvgPath

This function returns the `free draw` svg path for the element.

**How to use**

```js
import { getFreeDrawSvgPath } from "@drawink/drawink";
```

**Signature**

<pre>
getFreeDrawSvgPath(element: <a href="https://github.com/drawink/drawink/blob/master/packages/drawink/element/types.ts#L182">DrawinkFreeDrawElement</a>)
</pre>

### isLinearElement

This function returns true if the element is `linear` type (`arrow` |`line`) else returns `false`.

**How to use**

```js
import { isLinearElement } from "@drawink/drawink";
```

**Signature**

<pre>
isLinearElement(elementType?: <a href="https://github.com/drawink/drawink/blob/master/packages/drawink/element/types.ts#L80">DrawinkElement</a>): boolean
</pre>

### getNonDeletedElements

This function returns an array of `deleted` elements.

**How to use**

```js
import { getNonDeletedElements } from "@drawink/drawink";
```

**Signature**

<pre>
getNonDeletedElements(elements:<a href="https://github.com/drawink/drawink/blob/master/packages/drawink/element/types.ts#L114"> readonly DrawinkElement[]</a>): as readonly <a href="https://github.com/drawink/drawink/blob/master/packages/drawink/element/types.ts#L125">NonDeletedDrawinkElement[]</a>
</pre>

### mergeLibraryItems

This function merges two `LibraryItems` arrays, where unique items from `otherItems` are sorted first in the returned array.

```js
import { mergeLibraryItems } from "@drawink/drawink";
```

**_Signature_**

<pre>
mergeLibraryItems(<br/>&nbsp;
  localItems: <a href="https://github.com/drawink/drawink/blob/master/packages/drawink/types.ts#L250">LibraryItems</a>,<br/>&nbsp;
  otherItems: <a href="https://github.com/drawink/drawink/blob/master/packages/drawink/types.ts#L200">LibraryItems</a><br/>
): <a href="https://github.com/drawink/drawink/blob/master/packages/drawink/types.ts#L250">LibraryItems</a>
</pre>

### parseLibraryTokensFromUrl

Parses library parameters from URL if present (expects the `#addLibrary` hash key), and returns an object with the `libraryUrl` and `idToken`. Returns `null` if `#addLibrary` hash key not found.

**How to use**

```js
import { parseLibraryTokensFromUrl } from "@drawink/drawink";
```

**Signature**

```tsx
parseLibraryTokensFromUrl(): {
    libraryUrl: string;
    idToken: string | null;
} | null
```

### useHandleLibrary

A hook that automatically imports library from url if `#addLibrary` hash key exists on initial load, or when it changes during the editing session (e.g. when a user installs a new library), and handles initial library load if `getInitialLibraryItems` getter is supplied.

**How to use**

```js
import { useHandleLibrary } from "@drawink/drawink";

export const App = () => {
  // ...
  useHandleLibrary({ drawinkAPI });
};
```

**Signature**

<pre>
useHandleLibrary(opts: &#123;<br/>&nbsp;
  drawinkAPI: <a href="https://github.com/drawink/drawink/blob/master/packages/drawink/types.ts#L494">DrawinkAPI</a>,<br/>&nbsp;
  getInitialLibraryItems?: () => <a href="https://github.com/drawink/drawink/blob/master/packages/drawink/types.ts#L253">LibraryItemsSource</a><br/>
});
</pre>

In the future, we will be adding support for handling `library` persistence to `browser storage` (or elsewhere).

### getSceneVersion

This function returns the current `scene` version.

**_Signature_**

<pre>
getSceneVersion(elements:  <a href="https://github.com/drawink/drawink/blob/master/packages/drawink/element/types.ts#L114">DrawinkElement[]</a>)
</pre>

**How to use**

```js
import { getSceneVersion } from "@drawink/drawink";
```

### sceneCoordsToViewportCoords

This function returns equivalent `viewport` coords for the provided `scene` coords in params.

```js
import { sceneCoordsToViewportCoords } from "@drawink/drawink";
```

**_Signature_**

<pre>
sceneCoordsToViewportCoords(&#123; sceneX: number, sceneY: number },<br/>&nbsp;
  appState: <a href="https://github.com/drawink/drawink/blob/master/packages/drawink/types.ts#L95">AppState</a><br/>): &#123; x: number, y: number }
</pre>

### viewportCoordsToSceneCoords

This function returns equivalent `scene` coords for the provided `viewport` coords in params.

```js
import { viewportCoordsToSceneCoords } from "@drawink/drawink";
```

**_Signature_**

<pre>
viewportCoordsToSceneCoords(&#123; clientX: number, clientY: number },<br/>&nbsp;
  appState: <a href="https://github.com/drawink/drawink/blob/master/packages/drawink/types.ts#L95">AppState</a><br/>): &#123;x: number, y: number}
</pre>

### useEditorInterface

This hook can be used to check the type of device which is being used. It can only be used inside the `children` of `Drawink` component.

Open the `main menu` in the below example to view the footer.

```jsx live noInline
const MobileFooter = ({}) => {
  const editorInterface = useEditorInterface();
  if (editorInterface.formFactor === "phone") {
    return (
      <Footer>
        <button
          className="custom-footer"
          style={{ marginLeft: "20px", height: "2rem" }}
          onClick={() => alert("This is custom footer in mobile menu")}
        >
          custom footer
        </button>
      </Footer>
    );
  }
  return null;
};
const App = () => (
  <div style={{ height: "400px" }}>
    <Drawink>
      <MainMenu>
        <MainMenu.Item> Item1 </MainMenu.Item>
        <MainMenu.Item> Item 2 </MainMenu.Item>
        <MobileFooter />
      </MainMenu>
    </Drawink>
  </div>
);

// Need to render when code is span across multiple components
// in Live Code blocks editor
render(<App />);
```

The `device` has the following `attributes`, some grouped into `viewport` and `editor` objects, per context.

| Name | Type | Description |
| ---- | ---- | ----------- |

The `EditorInterface` object has the following properties:

| Name | Type | Description |
| --- | --- | --- | --- | --- | --- |
| `formFactor` | `'phone' | 'tablet' | 'desktop'` | Indicates the device type based on screen size |
| `desktopUIMode` | `'compact' | 'full'` | UI mode for desktop form factor |
| `userAgent.raw` | `string` | Raw user agent string |
| `userAgent.isMobileDevice` | `boolean` | True if device is mobile |
| `userAgent.platform` | `'ios' | 'android' | 'other' | 'unknown'` | Device platform |
| `isTouchScreen` | `boolean` | True if touch events are detected |
| `canFitSidebar` | `boolean` | True if sidebar can fit in the viewport |
| `isLandscape` | `boolean` | True if viewport is in landscape mode |

### i18n

To help with localization, we export the following.

| name | type |
| --- | --- |
| `defaultLang` | `string` |
| `languages` | [`Language[]`](https://github.com/drawink/drawink/blob/master/packages/drawink/i18n.ts#L15) |
| `useI18n` | [`() => { langCode, t }`](https://github.com/drawink/drawink/blob/master/packages/drawink/i18n.ts#L15) |

```js
import { defaultLang, languages, useI18n } from "@drawink/drawink";
```

#### defaultLang

Default language code, `en`.

#### languages

List of supported language codes. You can pass any of these to `Drawink`'s [`langCode` prop](/docs/@drawink/drawink/api/props/#langcode).

#### useI18n

A hook that returns the current language code and translation helper function. You can use this to translate strings in the components you render as children of `<Drawink>`.

```jsx live
function App() {
  const { t } = useI18n();
  return (
    <div style={{ height: "500px" }}>
      <Drawink>
        <button
          style={{ position: "absolute", zIndex: 10, height: "2rem" }}
          onClick={() => window.alert(t("labels.madeWithDrawink"))}
        >
          {t("buttons.confirm")}
        </button>
      </Drawink>
    </div>
  );
}
```

### getCommonBounds

This util can be used to get the common bounds of the passed elements.

**_Signature_**

```ts
getCommonBounds(
  elements: readonly DrawinkElement[]
): readonly [
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
]
```

**_How to use_**

```js
import { getCommonBounds } from "@drawink/drawink";
```

### elementsOverlappingBBox

To filter `elements` that are inside, overlap, or contain the `bounds` rectangle.

The bounds check is approximate and does not precisely follow the element's shape. You can also supply `errorMargin` which effectively makes the `bounds` larger by that amount.

This API has 3 `type`s of operation: `overlap`, `contain`, and `inside`:

- `overlap` - filters elements that are overlapping or inside bounds.
- `contain` - filters elements that are inside bounds or bounds inside elements.
- `inside` - filters elements that are inside bounds.

**_Signature_**

<pre>
elementsOverlappingBBox(<br/>&nbsp;
  elements: readonly NonDeletedDrawinkElement[];<br/>&nbsp;
  bounds: <a href="https://github.com/drawink/drawink/blob/9c425224c789d083bf16e0597ce4a429b9ee008e/src/element/bounds.ts#L37-L42">Bounds</a> | DrawinkElement;<br/>&nbsp;
  errorMargin?: number;<br/>&nbsp;
  type: "overlap" | "contain" | "inside";<br/>
): NonDeletedDrawinkElement[];
</pre>

**_How to use_**

```js
import { elementsOverlappingBBox } from "@drawink/drawink";
```

### isElementInsideBBox

Lower-level API than `elementsOverlappingBBox` to check if a single `element` is inside `bounds`. If `eitherDirection=true`, returns `true` if `element` is fully inside `bounds` rectangle, or vice versa. When `false`, it returns `true` only for the former case.

**_Signature_**

<pre>
isElementInsideBBox(<br/>&nbsp;
  element: NonDeletedDrawinkElement,<br/>&nbsp;
  bounds: <a href="https://github.com/drawink/drawink/blob/9c425224c789d083bf16e0597ce4a429b9ee008e/src/element/bounds.ts#L37-L42">Bounds</a>,<br/>&nbsp;
  eitherDirection = false,<br/>
): boolean
</pre>

**_How to use_**

```js
import { isElementInsideBBox } from "@drawink/drawink";
```

### elementPartiallyOverlapsWithOrContainsBBox

Checks if `element` is overlapping the `bounds` rectangle, or is fully inside.

**_Signature_**

<pre>
elementPartiallyOverlapsWithOrContainsBBox(<br/>&nbsp;
  element: NonDeletedDrawinkElement,<br/>&nbsp;
  bounds: <a href="https://github.com/drawink/drawink/blob/9c425224c789d083bf16e0597ce4a429b9ee008e/src/element/bounds.ts#L37-L42">Bounds</a>,<br/>
): boolean
</pre>

**_How to use_**

```js
import { elementPartiallyOverlapsWithOrContainsBBox } from "@drawink/drawink";
```
