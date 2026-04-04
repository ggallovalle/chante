import { defineConfig } from "tsdown"

export default defineConfig([
  {
    entry: {
      "testing/vitest": "src/testing/vitest.ts",
      uwu: "src/uwu.ts",
      "uwu/bun": "src/uwu/bun.ts",
      "uwu/node": "src/uwu/node.ts",
      miette: "src/miette.ts",
      kdl: "src/kdl.ts",
    },
    format: "esm",
    dts: true,
    clean: true,
  },
])
