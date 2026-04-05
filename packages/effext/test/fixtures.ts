export * as fc from "effect/testing/FastCheck"

import { assert, describe } from "vitest"

export { test } from "~/testing/vitest.js"
/** @public */
export { assert, describe }

import { Effect, Option } from "effect"
import type { Diagnostic } from "~/miette"

export const assertSome = Option.getOrThrow

export const assertDiagnosticPointsTo = Effect.fnUntraced(function* (
  diagnostic: Diagnostic,
  expected: string,
  labelIndex: number = 0,
) {
  const labels = diagnostic.labels
  assert(
    labels && labels.length > 0,
    `assertDiagnosticPointsTo failed: Diagnostic has no labels\n${diagnostic}`,
  )
  const label = labels.at(labelIndex)
  assert(
    label,
    `assertDiagnosticPointsTo failed: Label index ${labelIndex} out of bounds (0-${labels.length - 1})\n${diagnostic}`,
  )
  const sourceCode = diagnostic.sourceCode
  assert(
    sourceCode,
    `assertDiagnosticPointsTo failed: Diagnostic has no sourceCode\n${diagnostic}`,
  )
  const result = Effect.runSync(sourceCode.readSpan(label.span, 0, 0))
  const pointer = result.decode()
  assert.strictEqual(pointer, expected)
})

export {
  NodeFileSystem as PlatformFileSystem,
  NodePath as PlatformPath,
} from "@effect/platform-node"
