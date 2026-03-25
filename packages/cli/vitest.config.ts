import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"

const srcDir = resolve(fileURLToPath(new URL(".", import.meta.url)), "src")
const testDir = resolve(fileURLToPath(new URL(".", import.meta.url)), "test")

export default defineConfig({
  resolve: {
    alias: {
      "~": srcDir,
      "~test": testDir
    }
  },
  test: {
    include: ["./test/**/*.test.ts?(x)"],
    expect: {
      requireAssertions: true
    },
    sequence: {
      concurrent: true
    }
  }
})
