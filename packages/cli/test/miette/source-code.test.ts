import { describe } from "vitest"
import { Effect } from "effect"
import { test } from "../fixtures.js"
import {
  SourceOffset,
  SourceSpan,
  SourceCode,
  StringSourceCode
} from "../../src/miette/index.js"

const decode = (data: Uint8Array) => new TextDecoder().decode(data)

export function runSourceCodeTests(
  name: string,
  create: (source: string) => SourceCode
) {
  describe(name, () => {
    test("basic", ({ expect, effect }) =>
      effect(Effect.gen(function*() {
        const src = create("foo\n")
        const span = SourceSpan.from(SourceOffset.from(0), 4)

        const contents = yield* src.readSpan(span, 0, 0)

        expect(decode(contents.data)).toBe("foo\n")
        expect(contents.line).toBe(0)
        expect(contents.column).toBe(0)
      }))
    )

    test("shifted", ({ expect, effect }) =>
      effect(Effect.gen(function*() {
        const src = create("foobar")
        const span = SourceSpan.from(SourceOffset.from(3), 3)

        const contents = yield* src.readSpan(span, 1, 1)

        expect(decode(contents.data)).toBe("foobar")
        expect(contents.line).toBe(0)
        expect(contents.column).toBe(0)
      }))
    )

    test("middle", ({ expect, effect }) =>
      effect(Effect.gen(function*() {
        const src = create("foo\nbar\nbaz\n")
        const span = SourceSpan.from(SourceOffset.from(4), 4)

        const contents = yield* src.readSpan(span, 0, 0)

        expect(decode(contents.data)).toBe("bar\n")
        expect(contents.line).toBe(1)
        expect(contents.column).toBe(0)
      }))
    )

    test("middle_of_line", ({ expect, effect }) =>
      effect(Effect.gen(function*() {
        const src = create("foo\nbarbar\nbaz\n")
        const span = SourceSpan.from(SourceOffset.from(7), 4)

        const contents = yield* src.readSpan(span, 0, 0)

        expect(decode(contents.data)).toBe("bar\n")
        expect(contents.line).toBe(1)
        expect(contents.column).toBe(3)
      }))
    )

    test("with_crlf", ({ expect, effect }) =>
      effect(Effect.gen(function*() {
        const src = create("foo\r\nbar\r\nbaz\r\n")
        const span = SourceSpan.from(SourceOffset.from(5), 5)

        const contents = yield* src.readSpan(span, 0, 0)

        expect(decode(contents.data)).toBe("bar\r\n")
        expect(contents.line).toBe(1)
        expect(contents.column).toBe(0)
      }))
    )

    test("with_context", ({ expect, effect }) =>
      effect(Effect.gen(function*() {
        const src = create("xxx\nfoo\nbar\nbaz\n\nyyy\n")
        const span = SourceSpan.from(SourceOffset.from(8), 3)

        const contents = yield* src.readSpan(span, 1, 1)

        expect(decode(contents.data)).toBe("foo\nbar\nbaz\n")
        expect(contents.line).toBe(1)
        expect(contents.column).toBe(0)
      }))
    )

    test("multiline_with_context", ({ expect, effect }) =>
      effect(Effect.gen(function*() {
        const src = create("aaa\nxxx\n\nfoo\nbar\nbaz\n\nyyy\nbbb\n")
        const span = SourceSpan.from(SourceOffset.from(9), 11)

        const contents = yield* src.readSpan(span, 1, 1)

        expect(decode(contents.data)).toBe("\nfoo\nbar\nbaz\n\n")
        expect(contents.line).toBe(2)
        expect(contents.column).toBe(0)

        const expectedSpan = SourceSpan.from(SourceOffset.from(8), 14)
        expect(contents.span).toEqual(expectedSpan)
      }))
    )

    test("multiline_with_context_line_start", ({ expect, effect }) =>
      effect(Effect.gen(function*() {
        const src = create("one\ntwo\n\nthree\nfour\nfive\n\nsix\nseven\n")
        const span = SourceSpan.from(SourceOffset.from(2), 0)

        const contents = yield* src.readSpan(span, 2, 2)

        expect(decode(contents.data)).toBe("one\ntwo\n\n")
        expect(contents.line).toBe(0)
        expect(contents.column).toBe(0)

        const expectedSpan = SourceSpan.from(SourceOffset.from(0), 9)
        expect(contents.span).toEqual(expectedSpan)
      }))
    )
  })
}

runSourceCodeTests("StringSourceCode", (source) => {
  return new StringSourceCode(source)
})
