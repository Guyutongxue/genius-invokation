import { resolve } from "node:path";
import { defineConfig } from "vite";
import unoCss from "unocss/vite";
import preact from "@preact/preset-vite";
import { libInjectCss } from "vite-plugin-lib-inject-css";
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    unoCss(),
    preact(),
    libInjectCss(),
    dts({
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    minify: false,
    rollupOptions: {
      external: ["preact", /^preact\/.*/, "@preact/signals"],
    },
  },
  server: {
    // watch: null,
  },
});
