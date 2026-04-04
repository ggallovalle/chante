import { Schema } from "effect"

export class SourceSpan extends Schema.Class<SourceSpan>("miette/SourceSpan")({
  offset: Schema.Number,
  length: Schema.Number,
}) {
  static from(start: number, length: number) {
    return new SourceSpan({ offset: start, length })
  }

  static fromStartEnd(start: number, end: number) {
    return new SourceSpan({ offset: start, length: end - start })
  }

  static fromLocation(source: string, line: number, column: number) {
    let currentLine = 0
    let currentCol = 0
    let offset = 0

    for (const char of source) {
      if (currentLine + 1 >= line && currentCol + 1 >= column) {
        break
      }

      if (char === "\n") {
        currentCol = 0
        currentLine += 1
      } else {
        currentCol += 1
      }

      offset += utf8Length(char)
    }

    return new SourceSpan({ offset, length: 0 })
  }

  get isEmpty(): boolean {
    return this.length === 0
  }
}

export class LabeledSpan extends Schema.Class<LabeledSpan>(
  "miette/LabeledSpan",
)({
  label: Schema.optional(Schema.String),
  span: SourceSpan,
  primary: Schema.Boolean,
}) {
  static from(label: string | undefined, offset: number, length: number) {
    return new LabeledSpan({
      label,
      span: SourceSpan.from(offset, length),
      primary: false,
    })
  }

  static fromSpan(label: string | undefined, span: SourceSpan) {
    return new LabeledSpan({
      label,
      span,
      primary: false,
    })
  }

  static primaryFromSpan(label: string | undefined, span: SourceSpan) {
    return new LabeledSpan({
      label,
      span,
      primary: true,
    })
  }

  static at(span: SourceSpan, label: string) {
    return LabeledSpan.fromSpan(label, span)
  }

  static atOffset(offset: number, label: string) {
    return LabeledSpan.from(label, offset, 0)
  }

  static underline(span: SourceSpan) {
    return LabeledSpan.fromSpan(undefined, span)
  }

  static message(label: string) {
    return LabeledSpan.from(label, 0, 0)
  }

  get offset(): number {
    return this.span.offset
  }

  get len(): number {
    return this.span.length
  }

  get isEmpty(): boolean {
    return this.span.isEmpty
  }

  get isPrimary(): boolean {
    return this.primary
  }
}

export class SpanContents extends Schema.Class<SpanContents>(
  "miette/SpanContents",
)({
  data: Schema.Uint8Array,
  span: SourceSpan,
  line: Schema.Number,
  column: Schema.Number,
  lineCount: Schema.Number,
  name: Schema.optional(Schema.String),
  language: Schema.optional(Schema.String),
}) {
  static from(args: {
    data: Uint8Array
    span: SourceSpan
    line: number
    column: number
    lineCount: number
    name?: string
    language?: string
  }) {
    return new SpanContents(args)
  }

  static fromNamed(args: {
    name: string
    data: Uint8Array
    span: SourceSpan
    line: number
    column: number
    lineCount: number
  }) {
    return new SpanContents({
      ...args,
      language: undefined,
    })
  }

  withLanguage(language: string) {
    return new SpanContents({
      data: this.data,
      span: this.span,
      line: this.line,
      column: this.column,
      lineCount: this.lineCount,
      name: this.name,
      language,
    })
  }

  get offset(): number {
    return this.span.offset
  }

  get len(): number {
    return this.span.length
  }

  decode(): string {
    return new TextDecoder().decode(this.data)
  }
}

function utf8Length(char: string): number {
  const codePoint = char.codePointAt(0)

  if (codePoint === undefined) return 0

  if (codePoint <= 0x7f) return 1
  if (codePoint <= 0x7ff) return 2
  if (codePoint <= 0xffff) return 3
  return 4
}
