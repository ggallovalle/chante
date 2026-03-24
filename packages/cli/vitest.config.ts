import { defineConfig } from "vitest/config"

export default defineConfig({
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
