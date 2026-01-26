import { resolve } from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { ViteEjsPlugin } from "vite-plugin-ejs";
import { VitePWA } from "vite-plugin-pwa";
import svgrPlugin from "vite-plugin-svgr";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      ViteEjsPlugin(),
      svgrPlugin(),
      VitePWA({
        registerType: "autoUpdate",
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        },
        includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
        manifest: {
          name: "Drawink",
          short_name: "Drawink",
          description: "A collaborative whiteboard application",
          theme_color: "#ffffff",
          background_color: "#ffffff",
          display: "standalone",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
        "@/lib": resolve(__dirname, "./src/lib"),
        "@/components": resolve(__dirname, "./src/components"),
        "@/hooks": resolve(__dirname, "./src/hooks"),
        "@/convex": resolve(__dirname, "./src/convex"),
        "@/styles": resolve(__dirname, "./src/styles"),
        "@drawink/drawink": resolve(__dirname, "./packages/drawink"),
        "@drawink/common": resolve(__dirname, "./packages/common/src"),
        "@drawink/element": resolve(__dirname, "./packages/element/src"),
        "@drawink/math": resolve(__dirname, "./packages/math/src"),
        "@drawink/utils": resolve(__dirname, "./packages/utils/src"),
        "@drawink/types": resolve(__dirname, "./packages/types/src"),
      },
    },
    server: {
      port: 5173,
      open: true,
    },
    build: {
      outDir: "dist",
      sourcemap: true,
    },
  };
});
