import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false, // main.jsx registers via virtual:pwa-register
      includeAssets: ["icon.svg", "apple-touch-icon.png", "pwa-96.png"],
      manifest: {
        id: "/life-improver/",
        name: "Life Improver",
        short_name: "Life",
        description: "A weekly loop for tending one part of your life at a time.",
        theme_color: "#F4F3EF",
        background_color: "#F4F3EF",
        display: "standalone",
        display_override: ["standalone"],
        categories: ["health", "lifestyle"],
        start_url: "/life-improver/",
        scope: "/life-improver/",
        shortcuts: [
          {
            name: "Check in",
            short_name: "Check in",
            description: "Record this week's check-in",
            url: "/life-improver/#/checkin",
            icons: [{ src: "pwa-96.png", sizes: "96x96", type: "image/png" }],
          },
          {
            name: "Journey",
            short_name: "Journey",
            description: "See your trend over time",
            url: "/life-improver/#/journey",
            icons: [{ src: "pwa-96.png", sizes: "96x96", type: "image/png" }],
          },
        ],
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        globIgnores: ["splash/**"], // launch images are fetched by iOS itself
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  base: "/life-improver/",
  server: { port: 5173, open: true },
});
