import { describe } from "vitest"
import { Effect } from "effect"
import { test } from "../fixtures.js"
import {
  SourceOffset,
  SourceSpan,
  SourceCode,
  StringSourceCode,
  FromFileSourceCode,
  OutOfBounds
} from "../../src/miette/index.js"

export function runSourceCodeTests(
  name: string,
  create: (source: string) => Effect.Effect<SourceCode, any>
) {
  describe(name, () => {
    test("basic", ({ expect, effect }) =>
      effect(Effect.gen(function*() {
        const src = yield* create("foo\n")
        const span = SourceSpan.from(SourceOffset.from(0), 4)

        const contents = yield* src.readSpan(span, 0, 0)

        expect(contents.decode()).toBe("foo\n")
        expect(contents.line).toBe(0)
        expect(contents.column).toBe(0)
      }))
    )

    test("shifted", ({ expect, effect }) =>
      effect(Effect.gen(function*() {
        const src = yield* create("foobar")
        const span = SourceSpan.from(SourceOffset.from(3), 3)

        const contents = yield* src.readSpan(span, 1, 1)

        expect(contents.decode()).toBe("foobar")
        expect(contents.line).toBe(0)
        expect(contents.column).toBe(0)
      }))
    )

    test("middle", ({ expect, effect }) =>
      effect(Effect.gen(function*() {
        const src = yield* create("foo\nbar\nbaz\n")
        const span = SourceSpan.from(SourceOffset.from(4), 4)

        const contents = yield* src.readSpan(span, 0, 0)

        expect(contents.decode()).toBe("bar\n")
        expect(contents.line).toBe(1)
        expect(contents.column).toBe(0)
      }))
    )

    test("middle_of_line", ({ expect, effect }) =>
      effect(Effect.gen(function*() {
        const src = yield* create("foo\nbarbar\nbaz\n")
        const span = SourceSpan.from(SourceOffset.from(7), 4)

        const contents = yield* src.readSpan(span, 0, 0)

        expect(contents.decode()).toBe("bar\n")
        expect(contents.line).toBe(1)
        expect(contents.column).toBe(3)
      }))
    )

    test("with_crlf", ({ expect, effect }) =>
      effect(Effect.gen(function*() {
        const src = yield* create("foo\r\nbar\r\nbaz\r\n")
        const span = SourceSpan.from(SourceOffset.from(5), 5)

        const contents = yield* src.readSpan(span, 0, 0)

        expect(contents.decode()).toBe("bar\r\n")
        expect(contents.line).toBe(1)
        expect(contents.column).toBe(0)
      }))
    )

    test("with_context", ({ expect, effect }) =>
      effect(Effect.gen(function*() {
        const src = yield* create("xxx\nfoo\nbar\nbaz\n\nyyy\n")
        const span = SourceSpan.from(SourceOffset.from(8), 3)

        const contents = yield* src.readSpan(span, 1, 1)

        expect(contents.decode()).toBe("foo\nbar\nbaz\n")
        expect(contents.line).toBe(1)
        expect(contents.column).toBe(0)
      }))
    )

    test("multiline_with_context", ({ expect, effect }) =>
      effect(Effect.gen(function*() {
        const src = yield* create("aaa\nxxx\n\nfoo\nbar\nbaz\n\nyyy\nbbb\n")
        const span = SourceSpan.from(SourceOffset.from(9), 11)

        const contents = yield* src.readSpan(span, 1, 1)

        expect(contents.decode()).toBe("\nfoo\nbar\nbaz\n\n")
        expect(contents.line).toBe(2)
        expect(contents.column).toBe(0)

        const expectedSpan = SourceSpan.from(SourceOffset.from(8), 14)
        expect(contents.span).toEqual(expectedSpan)
      }))
    )

    test("multiline_with_context_line_start", ({ expect, effect }) =>
      effect(Effect.gen(function*() {
        const src = yield* create("one\ntwo\n\nthree\nfour\nfive\n\nsix\nseven\n")
        const span = SourceSpan.from(SourceOffset.from(2), 0)

        const contents = yield* src.readSpan(span, 2, 2)

        expect(contents.decode()).toBe("one\ntwo\n\n")
        expect(contents.line).toBe(0)
        expect(contents.column).toBe(0)

        const expectedSpan = SourceSpan.from(SourceOffset.from(0), 9)
        expect(contents.span).toEqual(expectedSpan)
      }))
    )

    test("out_of_bounds", ({ expect, effect }) =>
      effect(Effect.gen(function*() {
        const src = yield* create("short")
        const span = SourceSpan.from(SourceOffset.from(10), 2)

        const result = yield* Effect.result(src.readSpan(span, 0, 0))
        expect(result._tag).toBe("Failure")
        if (result._tag === "Failure") {
          expect(result.failure).toBeInstanceOf(OutOfBounds)
        }
      }))
    )

  })
}

runSourceCodeTests("StringSourceCode", (source) => {
  return Effect.succeed(new StringSourceCode(source))
})

runSourceCodeTests("FromFileSourceCode", (source) => {
  return Effect.succeed(new FromFileSourceCode("tmp", "some-path", "config.json", "json", new StringSourceCode(source)))
})
