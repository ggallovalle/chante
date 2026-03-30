import { test } from "../../../src/testing/vitest/index.js"

test("stub", ({ expect }) => {
  expect(1 + 1).toBe(2)
})
