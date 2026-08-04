import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// base must match the GitHub Pages path — this app's permanent origin is
// https://<user>.github.io/critter-counter/ and localStorage lives there.
export default defineConfig({
  base: "/critter-counter/",
  plugins: [react()],
  test: {
    // Pin a UTC-negative timezone (where the app is actually used) so the
    // local-vs-UTC date tests can catch a regression — in a UTC
    // environment like CI the two implementations agree at every hour.
    env: { TZ: "America/Toronto" },
  },
});
