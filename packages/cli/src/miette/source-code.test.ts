import { test, describe, expect } from "bun:test"
import { Effect, Exit } from "effect"
import { SourceOffset, SourceSpan, SourceCode, StringSourceCode } from "./index.js"

const decode = (data: Uint8Array) => new TextDecoder().decode(data)

export function runSourceCodeTests(
  name: string,
  create: (source: string) => SourceCode
) {
  describe(name, () => {
    test("basic", async () => {
      const src = create("foo\n")
      const span = SourceSpan.from(SourceOffset.from(0), 4)

      const exit = await Effect.runPromiseExit(src.readSpan(span, 0, 0))
      if (!Exit.isSuccess(exit)) throw exit.cause

      const contents = exit.value

      expect(decode(contents.data)).toBe("foo\n")
      expect(contents.line).toBe(0)
      expect(contents.column).toBe(0)
    })

    test("shifted", async () => {
      const src = create("foobar")
      const span = SourceSpan.from(SourceOffset.from(3), 3)

      const exit = await Effect.runPromiseExit(src.readSpan(span, 1, 1))
      if (!Exit.isSuccess(exit)) throw exit.cause

      const contents = exit.value

      expect(decode(contents.data)).toBe("foobar")
      expect(contents.line).toBe(0)
      expect(contents.column).toBe(0)
    })

    test("middle", async () => {
      const src = create("foo\nbar\nbaz\n")
      const span = SourceSpan.from(SourceOffset.from(4), 4)

      const exit = await Effect.runPromiseExit(src.readSpan(span, 0, 0))
      if (!Exit.isSuccess(exit)) throw exit.cause

      const contents = exit.value

      expect(decode(contents.data)).toBe("bar\n")
      expect(contents.line).toBe(1)
      expect(contents.column).toBe(0)
    })

    test("middle_of_line", async () => {
      const src = create("foo\nbarbar\nbaz\n")
      const span = SourceSpan.from(SourceOffset.from(7), 4)

      const exit = await Effect.runPromiseExit(src.readSpan(span, 0, 0))
      if (!Exit.isSuccess(exit)) throw exit.cause

      const contents = exit.value

      expect(decode(contents.data)).toBe("bar\n")
      expect(contents.line).toBe(1)
      expect(contents.column).toBe(3)
    })

    test("with_crlf", async () => {
      const src = create("foo\r\nbar\r\nbaz\r\n")
      const span = SourceSpan.from(SourceOffset.from(5), 5)

      const exit = await Effect.runPromiseExit(src.readSpan(span, 0, 0))
      if (!Exit.isSuccess(exit)) throw exit.cause

      const contents = exit.value

      expect(decode(contents.data)).toBe("bar\r\n")
      expect(contents.line).toBe(1)
      expect(contents.column).toBe(0)
    })
  })
}


runSourceCodeTests("StringSourceCode", (source) => {
  return new StringSourceCode(source)
})

