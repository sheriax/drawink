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
        "@drawink/drawink": resolve(__dirname, "./src/components/drawink/dist/prod/index.js"),
        "@drawink/common": resolve(__dirname, "./src/lib/common"),
        "@drawink/element": resolve(__dirname, "./src/lib/elements"),
        "@drawink/math": resolve(__dirname, "./src/lib/math"),
        "@drawink/utils": resolve(__dirname, "./src/lib/utils"),
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
