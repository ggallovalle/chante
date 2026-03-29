import { defineConfig } from "tsup"

export default defineConfig([
  {
    entry: {
      cli: "src/cli.ts",
    },
    format: ["esm"],
    dts: false,
    clean: true,
    splitting: false,
    sourcemap: true,
    external: ["effect", "@kbroom/*", "@bgotink/kdl", "@effect/platform-node"],
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
])
