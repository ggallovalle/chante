import { Effect } from "effect"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"
import { type MietteError, OutOfBounds } from "./error.js"
import { SourceSpan, SpanContents } from "./protocol.js"

export abstract class SourceCode {
  abstract readSpan(
    span: SourceSpan,
    contextLinesBefore: number,
    contextLinesAfter: number,
  ): Effect.Effect<SpanContents, MietteError>
}

function computeLineStarts(data: Uint8Array): number[] {
  const starts = [0]

  for (let i = 0; i < data.length; i++) {
    if (data[i] === 0x0a /* \n */) {
      starts.push(i + 1)
    }
  }

  return starts
}

function findLineAndColumn(
  offset: number,
  lineStarts: number[],
): { line: number; column: number } {
  let line = 0

  for (let i = 0; i < lineStarts.length; i++) {
    const current = lineStarts[i]
    if (current === undefined) break
    if (current > offset) break
    line = i
  }

  const lineStart = lineStarts[line] ?? 0
  const column = offset - lineStart
  return { line, column }
}

function sliceWithContext(
  data: Uint8Array,
  span: SourceSpan,
  lineStarts: number[],
  before: number,
  after: number,
) {
  const startOffset = span.offset
  const endOffset = startOffset + span.length
  const lastOffset = span.length === 0 ? startOffset : endOffset - 1

  const { line: startLine } = findLineAndColumn(startOffset, lineStarts)
  const { line: endLine } = findLineAndColumn(lastOffset, lineStarts)

  const contextStartLine = Math.max(0, startLine - before)
  const contextEndLine = Math.min(lineStarts.length - 1, endLine + after)

  const startByte = lineStarts[contextStartLine] ?? 0
  const endByte =
    contextEndLine + 1 < lineStarts.length
      ? (lineStarts[contextEndLine + 1] ?? data.length)
      : data.length

  return {
    slice: data.slice(startByte, endByte),
    startByte,
    startLine,
    lineCount: contextEndLine - contextStartLine + 1,
  }
}

export class StringSourceCode extends SourceCode {
  private readonly data: Uint8Array
  private readonly lineStarts: number[]

  constructor(source: string) {
    super()
    this.data = new TextEncoder().encode(source)
    this.lineStarts = computeLineStarts(this.data)
  }

  /**
   * Return the bytes contained in `span`, optionally padded with a number of
   * lines before and after the span (mirroring rust miette semantics).
   *
   * - With zero context lines we return exactly the span bytes.
   * - With context, we expand to include the requested surrounding lines.
   * - `line` is always the line number in the original source.
   * - `column` is the real column when no context is requested; otherwise it is
   *   reset to the start of the returned slice.
   */
  readSpan(
    span: SourceSpan,
    contextBefore: number,
    contextAfter: number,
  ): Effect.Effect<SpanContents, OutOfBounds> {
    return Effect.try({
      try: () => {
        const start = span.offset
        const end = start + span.length

        if (end > this.data.length) {
          throw new OutOfBounds()
        }

        let { slice, startByte, lineCount } = sliceWithContext(
          this.data,
          span,
          this.lineStarts,
          contextBefore,
          contextAfter,
        )

        const { line: lineInSource } = findLineAndColumn(start, this.lineStarts)

        // Without context we want the exact span, not the surrounding line(s).
        if (contextBefore === 0 && contextAfter === 0) {
          slice = this.data.slice(start, end)
          startByte = start

          const lastOffset = span.length === 0 ? start : end - 1
          const { line: endLine } = findLineAndColumn(
            lastOffset,
            this.lineStarts,
          )
          lineCount = endLine - lineInSource + 1
        }

        const { line: lineAtSliceStart } = findLineAndColumn(
          startByte,
          this.lineStarts,
        )

        // With context we reset column to 0 (miette's behaviour for these
        // tests). Without context it reflects the real column in the source.
        const column =
          contextBefore === 0 && contextAfter === 0
            ? start - (this.lineStarts[lineInSource] ?? 0)
            : 0

        const line =
          contextBefore === 0 && contextAfter === 0
            ? lineInSource
            : lineAtSliceStart

        const spanForContents = SourceSpan.from(startByte, slice.length)

        return SpanContents.from({
          data: slice,
          span: spanForContents,
          line,
          column,
          lineCount,
        })
      },
      catch() {
        return new OutOfBounds()
      },
    })
  }
}

export class FromFileSourceCode extends SourceCode {
  #inner: SourceCode
  public fs: string
  public path: string
  public name: string
  public language: string

  constructor(
    fs: string,
    path: string,
    name: string,
    language: string,
    content: SourceCode,
  ) {
    super()
    this.fs = fs
    this.path = path
    this.name = name
    this.language = language
    this.#inner = content
  }

  readSpan(
    span: SourceSpan,
    contextLinesBefore: number,
    contextLinesAfter: number,
  ): Effect.Effect<SpanContents, MietteError> {
    return Effect.map(
      this.#inner.readSpan(span, contextLinesBefore, contextLinesAfter),
      (span) => {
        return SpanContents.from({
          data: span.data,
          span: span.span,
          line: span.line,
          column: span.column,
          lineCount: span.lineCount,
          name: this.name,
          language: this.language,
        })
      },
    )
  }

  static readonly fromFile = Effect.fn("FromFileSourceCode.fromFile")(
    function* (path: string, language: string) {
      const fs = yield* FileSystem.FileSystem
      const pathModule = yield* Path.Path
      const content = yield* fs.readFileString(path)
      const name = pathModule.basename(path)
      const source = new StringSourceCode(content)
      return new FromFileSourceCode("fs", path, name, language, source)
    },
  )

  static readonly fromFileContent = Effect.fn("FromFileSourceCode.fromFile")(
    function* (path: string, language: string) {
      const fs = yield* FileSystem.FileSystem
      const pathModule = yield* Path.Path
      const content = yield* fs.readFileString(path)
      const name = pathModule.basename(path)
      const source = new StringSourceCode(content)
      return [
        new FromFileSourceCode("fs", path, name, language, source),
        content,
      ] as const
    },
  )
}
