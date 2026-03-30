import { defineConfig } from "tsup"

export default defineConfig([
  {
    entry: {
      "testing/vitest": "src/testing/vitest/index.ts",
      uwu: "src/uwu/index.ts",
      "uwu/bun": "src/uwu/bun.ts",
      miette: "src/miette/index.ts",
      kdl: "src/kdl/index.ts",
    },
    format: ["esm"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    external: ["effect", "vitest", "@kbroom/*"],
  },
])
