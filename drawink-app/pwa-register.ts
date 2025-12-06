// This file is conditionally imported only when PWA is enabled
// The import will fail if vite-plugin-pwa is not active
import { registerSW } from "virtual:pwa-register";

export function initPWA() {
  registerSW();
}
