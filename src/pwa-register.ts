// This file is only used when PWA is enabled
// When disabled, vite.config aliases this to pwa-register-disabled.ts
import { registerSW } from "virtual:pwa-register";

export function initPWA() {
  registerSW();
  console.log("[PWA] Service worker registered successfully");
}
