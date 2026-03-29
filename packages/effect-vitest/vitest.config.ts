import { resolve } from "node:path"
import { defineConfig } from "vitest/config"

const srcDir = resolve(import.meta.dirname, "src")
const testDir = resolve(import.meta.dirname, "test")

export default defineConfig({
  resolve: {
    alias: {
      "~": srcDir,
      "~test": testDir,
    },
  },
  test: {
    include: ["./test/**/*.test.ts?(x)"],
    expect: {
      requireAssertions: true,
    },
    sequence: {
      concurrent: true,
    },
  },
})
