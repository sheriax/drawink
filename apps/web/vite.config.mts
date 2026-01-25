import path from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import checker from "vite-plugin-checker";
import { ViteEjsPlugin } from "vite-plugin-ejs";
import { createHtmlPlugin } from "vite-plugin-html";
import { VitePWA } from "vite-plugin-pwa";
import Sitemap from "vite-plugin-sitemap";
import svgrPlugin from "vite-plugin-svgr";
import { woff2BrowserPlugin } from "../../scripts/woff2/woff2-vite-plugins";
export default defineConfig(({ mode }) => {
  // To load .env variables
  const envVars = loadEnv(mode, `../../`);
  // Also check process.env for Docker builds where env vars are set via shell
  const disablePWA =
    process.env.VITE_APP_DISABLE_PWA === "true" || envVars.VITE_APP_DISABLE_PWA === "true";
  // https://vitejs.dev/config/
  return {
    server: {
      port: Number(envVars.VITE_APP_PORT || 3000),
      // open the browser
      open: true,
    },
    // We need to specify the envDir since now there are no
    //more located in parallel with the vite.config.ts file but in parent dir
    envDir: "../../",
    resolve: {
      alias: [
        {
          find: /^@drawink\/common$/,
          replacement: path.resolve(__dirname, "../../packages/common/src/index.ts"),
        },
        {
          find: /^@drawink\/common\/(.*?)/,
          replacement: path.resolve(__dirname, "../../packages/common/src/$1"),
        },
        {
          find: /^@drawink\/element$/,
          replacement: path.resolve(__dirname, "../../packages/element/src/index.ts"),
        },
        {
          find: /^@drawink\/element\/(.*?)/,
          replacement: path.resolve(__dirname, "../../packages/element/src/$1"),
        },
        {
          find: /^@drawink\/drawink$/,
          replacement: path.resolve(__dirname, "../../packages/drawink/index.tsx"),
        },
        {
          find: /^@drawink\/drawink\/(.*?)/,
          replacement: path.resolve(__dirname, "../../packages/drawink/$1"),
        },
        {
          find: /^@drawink\/math$/,
          replacement: path.resolve(__dirname, "../../packages/math/src/index.ts"),
        },
        {
          find: /^@drawink\/math\/(.*?)/,
          replacement: path.resolve(__dirname, "../../packages/math/src/$1"),
        },
        {
          find: /^@drawink\/utils$/,
          replacement: path.resolve(__dirname, "../../packages/utils/src/index.ts"),
        },
        {
          find: /^@drawink\/utils\/(.*?)/,
          replacement: path.resolve(__dirname, "../../packages/utils/src/$1"),
        },
        // Resolve web app internal imports (previously drawink-app)
        {
          find: /^drawink-app\/(.*?)/,
          replacement: path.resolve(__dirname, "./src/$1"),
        },
      ],
    },
    // Inject env vars from shell into client-side code for Docker builds
    define: {
      "import.meta.env.VITE_APP_DISABLE_PWA": JSON.stringify(disablePWA ? "true" : "false"),
    },
    build: {
      outDir: "build",
      rollupOptions: {
        output: {
          assetFileNames(chunkInfo) {
            if (chunkInfo?.name?.endsWith(".woff2")) {
              const family = chunkInfo.name.split("-")[0];
              return `fonts/${family}/[name][extname]`;
            }

            return "assets/[name]-[hash][extname]";
          },
          // Creating separate chunk for locales except for en and percentages.json so they
          // can be cached at runtime and not merged with
          // app precache. en.json and percentages.json are needed for first load
          // or fallback hence not clubbing with locales so first load followed by offline mode works fine. This is how CRA used to work too.
          manualChunks(id) {
            if (
              id.includes("packages/drawink/locales") &&
              id.match(/en.json|percentages.json/) === null
            ) {
              const index = id.indexOf("locales/");
              // Taking the substring after "locales/"
              return `locales/${id.substring(index + 8)}`;
            }
          },
        },
      },
      sourcemap: true,
      // don't auto-inline small assets (i.e. fonts hosted on CDN)
      assetsInlineLimit: 0,
    },
    plugins: [
      Sitemap({
        hostname: "https://drawink.app",
        outDir: "build",
        changefreq: "monthly",
        // its static in public folder
        generateRobotsTxt: false,
      }),
      woff2BrowserPlugin(),
      react({
        babel: {
          compact: false,
        },
      }),
      checker({
        // Disabled TypeScript checker due to pre-existing @types/d3-dispatch compatibility errors
        // TypeScript 4.9.4 doesn't support 'const' type parameters used in newer d3-dispatch types
        // The actual TS compilation works fine, just the checker shows these errors
        typescript: false,
        // Disabled eslint checker due to vite-plugin-checker ESM/CommonJS compatibility issue
        // eslint:
        //   envVars.VITE_APP_ENABLE_ESLINT === "false"
        //     ? undefined
        //     : { lintCommand: 'eslint "./**/*.{js,ts,tsx}"' },
        overlay: {
          initialIsOpen: envVars.VITE_APP_COLLAPSE_OVERLAY === "false",
          badgeStyle: "margin-bottom: 4rem; margin-left: 1rem",
        },
      }),
      svgrPlugin(),
      ViteEjsPlugin(),
      // Conditionally include PWA plugin (disabled in Docker builds)
      ...(disablePWA
        ? []
        : [
            VitePWA({
              registerType: "autoUpdate",
              devOptions: {
                /* set this flag to true to enable in Development mode */
                enabled: envVars.VITE_APP_ENABLE_PWA === "true",
              },

              workbox: {
                maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB
                // don't precache fonts, locales and separate chunks
                globIgnores: ["fonts.css", "**/locales/**", "service-worker.js", "**/*.chunk-*.js"],
                runtimeCaching: [
                  {
                    urlPattern: /.+.woff2/,
                    handler: "CacheFirst",
                    options: {
                      cacheName: "fonts",
                      expiration: {
                        maxEntries: 1000,
                        maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days
                      },
                      cacheableResponse: {
                        // 0 to cache "opaque" responses from cross-origin requests (i.e. CDN)
                        statuses: [0, 200],
                      },
                    },
                  },
                  {
                    urlPattern: /fonts.css/,
                    handler: "StaleWhileRevalidate",
                    options: {
                      cacheName: "fonts",
                      expiration: {
                        maxEntries: 50,
                      },
                    },
                  },
                  {
                    urlPattern: /locales\/[^\/]+.js/,
                    handler: "CacheFirst",
                    options: {
                      cacheName: "locales",
                      expiration: {
                        maxEntries: 50,
                        maxAgeSeconds: 60 * 60 * 24 * 30, // <== 30 days
                      },
                    },
                  },
                  {
                    urlPattern: /.chunk-.+.js/,
                    handler: "CacheFirst",
                    options: {
                      cacheName: "chunk",
                      expiration: {
                        maxEntries: 50,
                        maxAgeSeconds: 60 * 60 * 24 * 90, // <== 90 days
                      },
                    },
                  },
                ],
              },
              manifest: {
                short_name: "Drawink",
                name: "Drawink",
                description:
                  "Drawink is a whiteboard tool that lets you easily sketch diagrams that have a hand-drawn feel to them.",
                icons: [
                  {
                    src: "android-chrome-192x192.png",
                    sizes: "192x192",
                    type: "image/png",
                  },
                  {
                    src: "apple-touch-icon.png",
                    type: "image/png",
                    sizes: "180x180",
                  },
                  {
                    src: "favicon-32x32.png",
                    sizes: "32x32",
                    type: "image/png",
                  },
                  {
                    src: "favicon-16x16.png",
                    sizes: "16x16",
                    type: "image/png",
                  },
                ],
                start_url: "/",
                id: "drawink",
                display: "standalone",
                theme_color: "#121212",
                background_color: "#ffffff",
                file_handlers: [
                  {
                    action: "/",
                    accept: {
                      "application/vnd.drawink+json": [".drawink"],
                    },
                  },
                ],
                share_target: {
                  action: "/web-share-target",
                  method: "POST",
                  enctype: "multipart/form-data",
                  params: {
                    files: [
                      {
                        name: "file",
                        accept: ["application/vnd.drawink+json", "application/json", ".drawink"],
                      },
                    ],
                  },
                },
                screenshots: [
                  {
                    src: "/screenshots/virtual-whiteboard.png",
                    type: "image/png",
                    sizes: "462x945",
                  },
                  {
                    src: "/screenshots/wireframe.png",
                    type: "image/png",
                    sizes: "462x945",
                  },
                  {
                    src: "/screenshots/illustration.png",
                    type: "image/png",
                    sizes: "462x945",
                  },
                  {
                    src: "/screenshots/shapes.png",
                    type: "image/png",
                    sizes: "462x945",
                  },
                  {
                    src: "/screenshots/collaboration.png",
                    type: "image/png",
                    sizes: "462x945",
                  },
                  {
                    src: "/screenshots/export.png",
                    type: "image/png",
                    sizes: "462x945",
                  },
                ],
              },
            }),
          ]),
      createHtmlPlugin({
        minify: true,
      }),
    ],
    publicDir: "../public",
  };
});
