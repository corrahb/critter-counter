import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base must match the GitHub Pages path — this app's permanent origin is
// https://<user>.github.io/critter-counter/ and localStorage lives there.
export default defineConfig({
  base: "/critter-counter/",
  plugins: [react()],
});
