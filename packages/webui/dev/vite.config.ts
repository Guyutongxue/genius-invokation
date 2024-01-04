import { defineConfig } from "vite";
import unoCss from "unocss/vite";
import preact from "@preact/preset-vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    unoCss(),
    preact()
  ],
  server: {
    watch: null,
  },
});
