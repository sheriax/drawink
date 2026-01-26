import "@drawink/drawink/global";
import "@drawink/drawink/css";

interface Window {
  __DRAWINK_SHA__: string | undefined;
  DRAWINK_THROTTLE_RENDER: boolean | undefined;
  EXCALIDRAW_ASSET_PATH: string | string[] | undefined;
}
