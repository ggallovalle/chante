import { Effect } from "effect"
import { type MietteError, OutOfBounds } from "./error.js"
import { SourceSpan, SpanContents } from "./index.js"

export interface SourceCode {
  readSpan(
    span: SourceSpan,
    contextLinesBefore: number,
    contextLinesAfter: number
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
  lineStarts: number[]
): { line: number; column: number } {
  let line = 0

  for (let i = 0; i < lineStarts.length; i++) {
    if (lineStarts[i] > offset) break
    line = i
  }

  const column = offset - lineStarts[line]
  return { line, column }
}

function sliceWithContext(
  data: Uint8Array,
  span: SourceSpan,
  lineStarts: number[],
  before: number,
  after: number
) {
  const startOffset = span.offsetValue
  const endOffset = startOffset + span.len

  const { line: startLine } = findLineAndColumn(startOffset, lineStarts)
  const { line: endLine } = findLineAndColumn(endOffset, lineStarts)

  const contextStartLine = Math.max(0, startLine - before)
  const contextEndLine = Math.min(lineStarts.length - 1, endLine + after)

  const startByte = lineStarts[contextStartLine]
  const endByte =
    contextEndLine + 1 < lineStarts.length
      ? lineStarts[contextEndLine + 1]
      : data.length

  return {
    slice: data.slice(startByte, endByte),
    startByte,
    startLine,
    lineCount: contextEndLine - contextStartLine + 1
  }
}

export class StringSourceCode implements SourceCode {
  private readonly data: Uint8Array
  private readonly lineStarts: number[]

  constructor(source: string) {
    this.data = new TextEncoder().encode(source)
    this.lineStarts = computeLineStarts(this.data)
  }

  readSpan(
    span: SourceSpan,
    contextBefore: number,
    contextAfter: number
  ): Effect.Effect<SpanContents, OutOfBounds> {
    return Effect.try({
      try: () => {
        const start = span.offsetValue
        const end = start + span.len

        if (end > this.data.length) {
          throw new OutOfBounds()
        }

        const {
          slice,
          startByte,
          lineCount
        } = sliceWithContext(
          this.data,
          span,
          this.lineStarts,
          contextBefore,
          contextAfter
        )

        const { line } = findLineAndColumn(start, this.lineStarts)

        // ✅ column relative to slice
        const column = start - startByte

        return SpanContents.from({
          data: slice,
          span,
          line,
          column,
          lineCount
        })
      },
      catch() {
        return new OutOfBounds()
      }
    })
  }

}
