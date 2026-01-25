import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./sentry";

import DrawinkApp from "./App";

window.__DRAWINK_SHA__ = import.meta.env.VITE_APP_GIT_SHA;
const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

// Conditionally register PWA (disabled in Docker builds)
if (import.meta.env.VITE_APP_DISABLE_PWA !== "true") {
  import("./pwa-register")
    .then(({ initPWA }) => {
      initPWA();
    })
    .catch(() => {
      // PWA registration module not available, skip
    });
}

root.render(
  <StrictMode>
    <DrawinkApp />
  </StrictMode>,
);
