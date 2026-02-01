import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./sentry";

import DrawinkApp from "./App";
import { SignIn, SignUp } from "./components/auth";
import { Dashboard } from "./pages/Dashboard";
import BillingSettings from "./pages/BillingSettings";
import { CLERK_PUBLISHABLE_KEY, clerkAppearance } from "./lib/clerk";
import { ConvexClientProvider } from "./lib/convex";

window.__DRAWINK_SHA__ = import.meta.env.VITE_APP_GIT_SHA;

// Set font asset path - the DrawinkFontFace class looks for EXCALIDRAW_ASSET_PATH
// Point to local public folder instead of external CDN
window.EXCALIDRAW_ASSET_PATH = window.location.origin + "/";
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
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      appearance={clerkAppearance}
    >
      <ConvexClientProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/sign-in/*" element={<SignIn />} />
            <Route path="/sign-up/*" element={<SignUp />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/billing" element={<BillingSettings />} />
            <Route path="/*" element={<DrawinkApp />} />
          </Routes>
        </BrowserRouter>
      </ConvexClientProvider>
    </ClerkProvider>
  </StrictMode>,
);
