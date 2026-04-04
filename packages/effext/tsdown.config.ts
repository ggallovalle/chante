import { defineConfig } from "tsdown"

export default defineConfig([
  {
    entry: [
      "src/testing/vitest.ts",
      "src/uwu.ts",
      "src/uwu/bun.ts",
      "src/uwu/node.ts",
      "src/miette.ts",
      "src/kdl.ts",
    ],
    format: "esm",
    fixedExtension: true,
    exports: {
      enabled: true,
      devExports: true,
      packageJson: false,
    },
    publint: true,
    dts: {
      enabled: true,
      tsgo: true,
    },
    clean: true,
  },
])
