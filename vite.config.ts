import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// base must match the GitHub Pages path — this app's permanent origin is
// https://<user>.github.io/critter-counter/ and localStorage lives there.
export default defineConfig({
  base: "/critter-counter/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // registration happens in main.tsx via virtual:pwa-register (so the
      // app can announce offline-readiness); don't inject a second one
      injectRegister: false,
      includeAssets: ["fonts/*.woff2", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Critter Counter",
        short_name: "Critters",
        description: "A personal wildlife tally for the evening walk.",
        theme_color: "#0E1F17",
        background_color: "#0E1F17",
        display: "standalone",
        orientation: "portrait",
        start_url: "/critter-counter/",
        scope: "/critter-counter/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // precache EVERYTHING the app needs — fonts included — so it works
        // fully offline from the first install
        globPatterns: ["**/*.{js,css,html,woff2,png,svg,ico}"],
        navigateFallback: "/critter-counter/index.html",
        // a freshly downloaded update takes over immediately instead of
        // waiting for every window to close — Android keeps installed PWAs
        // half-alive, which otherwise delays updates by days
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    // Pin a UTC-negative timezone (where the app is actually used) so the
    // local-vs-UTC date tests can catch a regression — in a UTC
    // environment like CI the two implementations agree at every hour.
    env: { TZ: "America/Toronto" },
  },
});
