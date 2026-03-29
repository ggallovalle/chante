export { test } from "@kbroom/effect-vitest"
export * as fc from "effect/testing/FastCheck"
export { assert, describe } from "vitest"

import { flow, Result } from "effect"

export const assertResultSuccess = Result.getOrThrow
export const assertResultFailure = flow(Result.flip, Result.getOrThrow)
