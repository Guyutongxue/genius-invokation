import * as bun from "bun";
import dts from "bun-plugin-dts";
import { execSync } from "node:child_process";

console.log("Bun: index.js")
await bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  external: ["preact"],
  sourcemap: "external",
  plugins: [
    dts()
  ]
});

console.log("Unocss: uno.css")
execSync(`bunx --bun unocss "src/**/*.tsx" -o dist/uno.css`)

console.log("Mix: index.css")
const indexCss = bun.file("src/index.css");
const finalCss = `@import url("./uno.css");\n` + await indexCss.text();
await bun.write("./dist/index.css", finalCss);
