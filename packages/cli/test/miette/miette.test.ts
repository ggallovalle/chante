import { describe } from "vitest"
import { test } from "../fixtures.js"
import { SourceOffset, SourceSpan, LabeledSpan, SpanContents } from "../../src/miette"

describe("SourceOffset", () => {
  test(".fromLocation (miette parity)", ({ expect }) => {
    const source = "f\n\noo\r\nbar"

    expect(SourceOffset.fromLocation(source, 1, 1).offset).toBe(0)
    expect(SourceOffset.fromLocation(source, 1, 2).offset).toBe(1)
    expect(SourceOffset.fromLocation(source, 2, 1).offset).toBe(2)
    expect(SourceOffset.fromLocation(source, 3, 1).offset).toBe(3)
    expect(SourceOffset.fromLocation(source, 3, 2).offset).toBe(4)
    expect(SourceOffset.fromLocation(source, 3, 3).offset).toBe(5)
    expect(SourceOffset.fromLocation(source, 3, 4).offset).toBe(6)
    expect(SourceOffset.fromLocation(source, 4, 1).offset).toBe(7)
    expect(SourceOffset.fromLocation(source, 4, 2).offset).toBe(8)
    expect(SourceOffset.fromLocation(source, 4, 3).offset).toBe(9)
    expect(SourceOffset.fromLocation(source, 4, 4).offset).toBe(10)

    // Out-of-range (should clamp to source length in bytes)
    expect(SourceOffset.fromLocation(source, 5, 1).offset).toBe(
      new TextEncoder().encode(source).length
    )
  })

  test(".fromLocation handles UTF-8 correctly", ({ expect }) => {
    const source = "a💀b" // 💀 = 4 bytes

    expect(SourceOffset.fromLocation(source, 1, 1).offset).toBe(0)
    expect(SourceOffset.fromLocation(source, 1, 2).offset).toBe(1)
    expect(SourceOffset.fromLocation(source, 1, 3).offset).toBe(5) // 1 + 4
  })
})

describe("SourceSpan", () => {
  test(".from creates a span correctly", ({ expect }) => {
    const start = SourceOffset.from(5)
    const span = SourceSpan.from(start, 10)

    expect(span.offsetValue).toBe(5)
    expect(span.len).toBe(10)
    expect(span.isEmpty).toBe(false)
  })

  test(".isEmpty returns true for zero-length spans", ({ expect }) => {
    const start = SourceOffset.from(3)
    const span = SourceSpan.from(start, 0)

    expect(span.offsetValue).toBe(3)
    expect(span.len).toBe(0)
    expect(span.isEmpty).toBe(true)
  })

  test("offsetValue reflects underlying SourceOffset", ({ expect }) => {
    const start = SourceOffset.from(42)
    const span = SourceSpan.from(start, 1)

    expect(span.offsetValue).toBe(42)
  })
})

describe("LabeledSpan", () => {
  test(".from creates non-primary labeled span", ({ expect }) => {
    const span = LabeledSpan.from("hello", 5, 10)

    expect(span.label).toBe("hello")
    expect(span.offset).toBe(5)
    expect(span.len).toBe(10)
    expect(span.isPrimary).toBe(false)
  })

  test(".fromSpan uses existing span", ({ expect }) => {
    const base = SourceSpan.from(SourceOffset.from(3), 4)
    const span = LabeledSpan.fromSpan("label", base)

    expect(span.span).toEqual(base)
    expect(span.offset).toBe(3)
    expect(span.len).toBe(4)
  })

  test(".primaryFromSpan sets primary=true", ({ expect }) => {
    const base = SourceSpan.from(SourceOffset.from(1), 2)
    const span = LabeledSpan.primaryFromSpan("primary", base)

    expect(span.isPrimary).toBe(true)
  })

  test(".at creates labeled span from span", ({ expect }) => {
    const base = SourceSpan.from(SourceOffset.from(0), 3)
    const span = LabeledSpan.at(base, "test")

    expect(span.label).toBe("test")
    expect(span.len).toBe(3)
  })

  test(".atOffset creates zero-length span", ({ expect }) => {
    const span = LabeledSpan.atOffset(4, "msg")

    expect(span.offset).toBe(4)
    expect(span.len).toBe(0)
  })

  test(".underline creates unlabeled span", ({ expect }) => {
    const base = SourceSpan.from(SourceOffset.from(2), 5)
    const span = LabeledSpan.underline(base)

    expect(span.label).toBeUndefined()
    expect(span.len).toBe(5)
  })
})

describe("SpanContents", () => {
  const data = new TextEncoder().encode("hello world")
  const span = SourceSpan.from(SourceOffset.from(0), 5)

  test(".from creates basic contents", ({ expect }) => {
    const contents = SpanContents.from({
      data,
      span,
      line: 0,
      column: 0,
      lineCount: 1
    })

    expect(contents.data).toBe(data)
    expect(contents.span).toEqual(span)
    expect(contents.line).toBe(0)
    expect(contents.column).toBe(0)
    expect(contents.lineCount).toBe(1)
    expect(contents.name).toBeUndefined()
    expect(contents.language).toBeUndefined()
  })

  test(".fromNamed sets name", ({ expect }) => {
    const contents = SpanContents.fromNamed({
      name: "file.ts",
      data,
      span,
      line: 0,
      column: 0,
      lineCount: 1
    })

    expect(contents.name).toBe("file.ts")
  })

  test(".withLanguage returns new instance", ({ expect }) => {
    const contents = SpanContents.from({
      data,
      span,
      line: 0,
      column: 0,
      lineCount: 1
    })

    const updated = contents.withLanguage("ts")

    expect(contents.language).toBeUndefined()
    expect(updated.language).toBe("ts")
  })

  test("derived getters work", ({ expect }) => {
    const contents = SpanContents.from({
      data,
      span,
      line: 0,
      column: 0,
      lineCount: 1
    })

    expect(contents.offset).toBe(0)
    expect(contents.len).toBe(5)
  })
})
