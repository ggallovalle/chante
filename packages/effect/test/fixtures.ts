export * as fc from "effect/testing/FastCheck"
export { assert, describe } from "vitest"
export { test } from "~/testing/vitest/index.js"

import { flow, Result } from "effect"

export const assertResultSuccess = Result.getOrThrow
export const assertResultFailure = flow(Result.flip, Result.getOrThrow)
