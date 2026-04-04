import { defineConfig } from "bunup"

export default defineConfig({
  entry: [
    "src/uwu.ts",
    "src/uwu/bun.ts",
    "src/uwu/node.ts",
    // ** this works
    // "src/kdl.ts",
    // "src/miette.ts",
    // ** this fails
    "src/miette.ts",
    "src/kdl.ts",
  ],
  format: "esm",
  dts: true,
  clean: true,
})
