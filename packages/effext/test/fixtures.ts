export * as fc from "effect/testing/FastCheck"
export { assert, describe } from "vitest"
export { test } from "~/testing/vitest.js"

import { flow, Option, Result } from "effect"

export const assertResultSuccess = Result.getOrThrow
export const assertResultFailure = flow(Result.flip, Result.getOrThrow)
export const assertSome = Option.getOrThrow

export {
  NodeFileSystem as PlatformFileSystem,
  NodePath as PlatformPath,
} from "@effect/platform-node"
