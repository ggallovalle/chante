import { defineConfig } from "tsup"

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      bun: "src/bun.ts",
    },
    format: ["esm"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    external: ["effect"],
  },
])
