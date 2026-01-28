import "@drawink/drawink/global";
import "@drawink/drawink/css";

interface Window {
  __DRAWINK_SHA__: string | undefined;
  DRAWINK_THROTTLE_RENDER: boolean | undefined;
  EXCALIDRAW_ASSET_PATH: string | string[] | undefined;
  EXCALIDRAW_EXPORT_SOURCE: string | undefined;
  sa_event: ((event: string, properties?: Record<string, unknown>) => void) | undefined;
  DEBUG_FRACTIONAL_INDICES: boolean | undefined;
  visualDebug?: {
    data: unknown[];
  };
}
