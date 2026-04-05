import { type Cause, Effect, Queue, Stream } from "effect"
import type { IColorizer } from "~/uwu.js"
import { NoopColorizer } from "~/uwu.js"
import type { Diagnostic } from "../diagnostic.js"
import type { IHighlighter } from "../highlihter/noop.js"
import { LabeledSpan, type SpanContents } from "../protocol.js"
import type { SourceCode } from "../source-code.js"
import { type IReportHandler, TypeId } from "./handler.js"
import { ThemeCharacters } from "./theme.js"

type LinkStyle = "link" | "text" | "none"

export class GraphicalReportHandler implements IReportHandler {
  public readonly [TypeId] = TypeId
  public links: LinkStyle
  public theme: ThemeCharacters
  public footer?: string | undefined
  public withCauseChain: boolean
  public linkDisplayText?: string | undefined
  public colorizer: IColorizer
  public highlighter: IHighlighter

  constructor(options: {
    links: LinkStyle
    theme: ThemeCharacters
    footer?: string | undefined
    withCauseChain: boolean
    linkDisplayText?: string | undefined
    colorizer: IColorizer
    highlighter: IHighlighter
  }) {
    this.links = options.links
    this.theme = options.theme
    this.footer = options.footer
    this.withCauseChain = options.withCauseChain
    this.linkDisplayText = options.linkDisplayText
    this.colorizer = options.colorizer
    this.highlighter = options.highlighter
  }

  public static default(colorizer: IColorizer, highlighter: IHighlighter) {
    return new GraphicalReportHandler({
      links: "text",
      // termwidth: 200,
      theme: ThemeCharacters.unicode(),
      // contextLines: 3,
      // tabWidth: 3,
      withCauseChain: true,
      // wrapLines: true,
      // breakWords: true,
      // withPrimarySpanStart: true,
      linkDisplayText: "(link)",
      // showRelatedAsNested: false,
      colorizer,
      highlighter,
    })
  }

  public static themed(
    theme: ThemeCharacters,
    colorizer: IColorizer,
    highlighter: IHighlighter,
  ) {
    return new GraphicalReportHandler({
      links: "text",
      // termwidth: 200,
      theme,
      // contextLines: 3,
      // tabWidth: 3,
      withCauseChain: true,
      // wrapLines: true,
      // breakWords: true,
      // withPrimarySpanStart: true,
      linkDisplayText: "(link)",
      // showRelatedAsNested: false,
      colorizer,
      highlighter,
    })
  }

  public renderReport(diagnostic: Diagnostic): Stream.Stream<string> {
    const self = this
    return Stream.callback<string>((queue) => {
      return Effect.gen(function* () {
        // yield* Queue.offer(queue, "render-report")
        yield* self.renderReportInner(queue, diagnostic, diagnostic.sourceCode)
        yield* Queue.end(queue)
      })
    })
  }

  private renderReportInner(
    queue: Queue.Queue<string, Cause.Done>,
    diagnostic: Diagnostic,
    parentSrc?: SourceCode,
  ) {
    const self = this
    return Effect.gen(function* () {
      const src: SourceCode | undefined = diagnostic.sourceCode ?? parentSrc
      yield* self.renderHeader(queue, diagnostic, false)
      yield* self.renderCauses(queue, diagnostic, src)
      yield* self.renderSnippets(queue, diagnostic, src)
      // renderFooter
      if (diagnostic.help !== undefined) {
        const initialIdent = self.colorizer.help("help: ")
        yield* Queue.offer(queue, `${initialIdent}${diagnostic.help}`)
      }

      if (self.footer !== undefined) {
        yield* Queue.offer(queue, self.footer)
      }
    })
  }

  private renderHeader(
    queue: Queue.Queue<string, Cause.Done>,
    diagnostic: Diagnostic,
    isNested: boolean,
  ) {
    const self = this
    return Effect.gen(function* () {
      let needNewline = isNested
      const severity = diagnostic.severity
      const buffer = []

      // Link style OSC 8 hyperlink
      if (self.links === "link" && diagnostic.url) {
        const code = diagnostic.code
          ? `${self.colorizer.diagnostic(severity, diagnostic.code)} `
          : ""
        const displayText = self.linkDisplayText ?? "(link)"
        const linkStyled = self.colorizer.link(displayText)
        const line = `\u001b]8;;${diagnostic.url}\u001b\\${code}${linkStyled}\u001b]8;;\u001b\\`
        buffer.push(line)
        // yield* Queue.offer(queue, line)
        needNewline = true
      } else if (diagnostic.code) {
        let line = self.colorizer.diagnostic(severity, diagnostic.code)
        if (self.links === "text" && diagnostic.url) {
          line += ` (${self.colorizer.link(diagnostic.url)})`
        }
        // yield* Queue.offer(queue, line)
        buffer.push(line)
        needNewline = true
      }

      if (needNewline) {
        // yield* Queue.offer(queue, "")
        buffer.push("")
      }

      yield* Queue.offerAll(queue, buffer)
    })
  }

  private renderCauses(
    queue: Queue.Queue<string, Cause.Done>,
    diagnostic: Diagnostic,
    _parentSrc?: SourceCode,
  ) {
    const self = this
    return Effect.gen(function* () {
      const severity = diagnostic.severity
      const severityIcon = self.theme.diagnostic(severity)

      const iconIndent = self.colorizer.diagnostic(severity, severityIcon)
      const rootLines = self.splitLines(
        diagnostic.info,
        `  ${iconIndent} `,
        `  ${self.colorizer.diagnostic(severity, self.theme.vbar)} `,
      )

      let emitted = rootLines.length > 0
      if (rootLines.length > 0) {
        yield* Queue.offerAll(queue, rootLines)
      }

      if (!self.withCauseChain) {
        if (emitted) yield* Queue.offer(queue, "")
        return
      }

      const causes = self.collectCauses(diagnostic.diagnosticSource)

      for (const [index, cause] of causes.entries()) {
        const isLast = index === causes.length - 1
        const branch = isLast ? self.theme.lbot : self.theme.lcross
        const branchPrefix = `${branch}${self.theme.hbar}${self.theme.rarrow}`
        const initialIndent = `  ${self.colorizer.diagnostic(severity, branchPrefix)} `
        const restGlyph = isLast ? " " : self.theme.vbar
        const subsequentIndent = `  ${self.colorizer.diagnostic(severity, restGlyph)}   `

        const causeLines = self.splitLines(
          cause.info,
          initialIndent,
          subsequentIndent,
        )

        if (causeLines.length > 0) {
          yield* Queue.offerAll(queue, causeLines)
          emitted = true
        }
      }

      if (emitted) {
        yield* Queue.offer(queue, "")
      }
    })
  }

  private renderSnippets(
    queue: Queue.Queue<string, Cause.Done>,
    diagnostic: Diagnostic,
    source?: SourceCode,
  ) {
    const self = this
    return Effect.gen(function* () {
      if (source === undefined) return
      const labels = diagnostic.labels
      if (labels === undefined || labels.length === 0) return

      const sorted = [...labels].sort((a, b) => a.offset - b.offset)
      const contexts: Array<LabeledSpan> = []

      for (const label of sorted) {
        const span = label.span
        const ctxStart = span.offset
        const ctxEnd = span.offset + span.length

        const last = contexts[contexts.length - 1]
        if (last !== undefined) {
          const lastEnd = last.offset + last.len
          if (ctxStart <= lastEnd) {
            const newStart = Math.min(last.offset, ctxStart)
            const newEnd = Math.max(lastEnd, ctxEnd)
            const merged = LabeledSpan.from(
              last.label ?? label.label,
              newStart,
              newEnd - newStart,
            )
            contexts[contexts.length - 1] = merged
            continue
          }
        }

        contexts.push(label)
      }

      for (const context of contexts) {
        yield* self.renderContext(queue, source, context, sorted, diagnostic)
      }
    })
  }

  private renderContext(
    queue: Queue.Queue<string, Cause.Done>,
    source: SourceCode,
    context: LabeledSpan,
    labels: Array<LabeledSpan>,
    _diagnostic: Diagnostic,
  ) {
    const self = this
    return Effect.gen(function* () {
      const contents = yield* Effect.match({
        onFailure: () => undefined,
        onSuccess: (span: SpanContents) => span,
      })(source.readSpan(context.span, 1, 1))

      if (contents === undefined) return

      const text = new TextDecoder().decode(contents.data)
      const lines = self.decodeLines(text, contents)
      if (lines.length === 0) return

      const lastLine = lines[lines.length - 1]!
      const linumWidth = lastLine.lineNumber.toString().length
      const headerLeft = " ".repeat(linumWidth + 2)
      const sourceName = contents.name ?? "source"
      const headerLabel = `${sourceName}:${contents.line + 1}:${
        contents.column + 1
      }`
      const header = `${headerLeft}${self.theme.ltop}${self.theme.hbar}[${self.colorizer.link(
        headerLabel,
      )}]`
      yield* Queue.offer(queue, header)

      const widthPrefix = (line: number) =>
        `${self.colorizer.lineNumber(String(line).padStart(linumWidth, " "))} ${self.theme.vbar} `

      const contextStart = contents.span.offset
      const contextEnd = contextStart + contents.span.length
      const labelsInContext = labels.filter((label) => {
        const start = label.offset
        const end = label.offset + label.len
        return start >= contextStart && end <= contextEnd
      })

      for (const line of lines) {
        const expanded = self.expandTabs(line.text)
        const highlighted = yield* self.highlighter.highlight(
          expanded,
          contents.language,
        )
        const prefix = widthPrefix(line.lineNumber)
        yield* Queue.offer(queue, `${prefix}${highlighted}`)

        const lineLabels = labelsInContext.filter((label) => {
          const start = label.offset
          const end = label.offset + label.len
          return start < line.end && end > line.start
        })

        if (lineLabels.length === 0) continue

        const underline = self.buildUnderline(expanded, line, lineLabels)
        yield* Queue.offer(queue, `${prefix}${underline}`)
      }

      const footer = `${" ".repeat(linumWidth + 2)}${self.theme.lbot}${self.theme.hbar.repeat(
        3,
      )}`
      yield* Queue.offer(queue, footer)
      yield* Queue.offer(queue, "")
    })
  }

  private buildUnderline(
    expanded: string,
    line: { start: number; end: number },
    labels: Array<LabeledSpan>,
  ) {
    const underline = Array.from({ length: expanded.length }, () => " ")
    if (underline.length === 0) return ""
    if (underline.length === 0) return ""
    let labelText: string | undefined

    for (const label of labels) {
      const start = Math.max(0, label.offset - line.start)
      const end = Math.min(
        expanded.length,
        label.offset + label.len - line.start,
      )
      if (label.len === 0) {
        const pos = Math.min(underline.length - 1, start)
        underline[pos] = this.theme.uarrow
      } else {
        for (let i = start; i < Math.max(end, start + 1); i++) {
          underline[i] = this.theme.underline
        }
      }
      if (labelText === undefined) {
        labelText = label.label
      }
    }

    const rendered = underline.join("")
    return labelText === undefined ? rendered : `${rendered} ${labelText}`
  }

  private decodeLines(text: string, contents: SpanContents) {
    const result: Array<{
      lineNumber: number
      text: string
      start: number
      end: number
    }> = []
    let offset = contents.span.offset
    const baseLine = contents.line

    const parts = text.split("\n")
    for (let i = 0; i < parts.length; i++) {
      const lineText = parts[i] ?? ""
      const start = offset
      const end = offset + lineText.length
      result.push({
        lineNumber: baseLine + i + 1,
        text: lineText,
        start,
        end,
      })
      offset = end + 1
    }

    return result
  }

  private expandTabs(value: string) {
    if (value.indexOf("\t") === -1) return value
    const tabWidth = 4
    let out = ""
    let col = 0
    for (const char of value) {
      if (char === "\t") {
        const spaces = tabWidth - (col % tabWidth)
        out += " ".repeat(spaces)
        col += spaces
      } else {
        out += char
        col += 1
      }
    }
    return out
  }

  private collectCauses(diagnostic?: Diagnostic | null): Array<Diagnostic> {
    const causes: Diagnostic[] = []
    let current: Diagnostic | null | undefined = diagnostic
    while (current != null) {
      causes.push(current)
      current = current.diagnosticSource ?? null
    }
    return causes
  }

  private splitLines(
    text: string,
    initialIndent: string,
    subsequentIndent: string,
  ) {
    const lines: string[] = []
    const trimmedSub = subsequentIndent.trimEnd()
    const parts = text.split("\n")

    parts.forEach((line, idx) => {
      let prefix: string
      if (idx === 0) {
        prefix =
          line.trim().length === 0 ? initialIndent.trimEnd() : initialIndent
      } else if (line.trim().length === 0) {
        prefix = trimmedSub
      } else {
        prefix = subsequentIndent
      }
      lines.push(`${prefix}${line}`)
    })

    if (text.endsWith("\n")) {
      lines.push("")
    }

    return lines
  }
}

export class OptimizedGraphicalReportHandler implements IReportHandler {
  public readonly [TypeId] = TypeId
  public links: LinkStyle
  public theme: ThemeCharacters
  public footer?: string | undefined
  public withCauseChain: boolean
  public linkDisplayText?: string | undefined
  public colorizer: IColorizer

  constructor(options: {
    links: LinkStyle
    theme: ThemeCharacters
    footer?: string
    withCauseChain: boolean
    linkDisplayText?: string
    colorizer: IColorizer
  }) {
    this.links = options.links
    this.theme = options.theme
    this.footer = options.footer
    this.withCauseChain = options.withCauseChain
    this.linkDisplayText = options.linkDisplayText
    this.colorizer = options.colorizer
  }

  public static default(colorizer: IColorizer = new NoopColorizer()) {
    return new OptimizedGraphicalReportHandler({
      links: "text",
      theme: ThemeCharacters.unicode(),
      withCauseChain: true,
      linkDisplayText: "(link)",
      colorizer,
    })
  }

  public static themed(
    theme: ThemeCharacters,
    colorizer: IColorizer = new NoopColorizer(),
  ) {
    return new OptimizedGraphicalReportHandler({
      links: "text",
      theme,
      withCauseChain: true,
      linkDisplayText: "(link)",
      colorizer,
    })
  }

  public renderReport(diagnostic: Diagnostic) {
    const self = this
    return Stream.callback<string>((queue) => {
      return Effect.gen(function* () {
        yield* self.renderReportInner(queue, diagnostic, diagnostic.sourceCode)
        yield* Queue.end(queue)
      })
    })
  }

  private renderReportInner(
    queue: Queue.Queue<string, Cause.Done>,
    diagnostic: Diagnostic,
    parentSrc?: SourceCode,
  ) {
    const self = this
    return Effect.gen(function* () {
      const src: SourceCode | undefined = diagnostic.sourceCode ?? parentSrc
      yield* self.renderHeader(queue, diagnostic, false)
      yield* self.renderCauses(queue, diagnostic, src)
      if (diagnostic.help !== undefined) {
        const initialIdent = self.colorizer.help("help: ")
        yield* Queue.offer(queue, `${initialIdent}${diagnostic.help}`)
      }
      if (self.footer !== undefined) {
        yield* Queue.offer(queue, self.footer)
      }
    })
  }

  private renderHeader(
    queue: Queue.Queue<string, Cause.Done>,
    diagnostic: Diagnostic,
    isNested: boolean,
  ) {
    const self = this
    return Effect.gen(function* () {
      let needNewline = isNested
      const severity = diagnostic.severity
      const buffer: string[] = []

      if (self.links === "link" && diagnostic.url) {
        const code = diagnostic.code
          ? `${self.colorizer.diagnostic(severity, diagnostic.code)} `
          : ""
        const displayText = self.linkDisplayText ?? "(link)"
        const linkStyled = self.colorizer.link(displayText)
        const line = `\u001b]8;;${diagnostic.url}\u001b\\${code}${linkStyled}\u001b]8;;\u001b\\`
        buffer.push(line)
        needNewline = true
      } else if (diagnostic.code) {
        let line = self.colorizer.diagnostic(severity, diagnostic.code)
        if (self.links === "text" && diagnostic.url) {
          line += ` (${self.colorizer.link(diagnostic.url)})`
        }
        buffer.push(line)
        needNewline = true
      }

      if (needNewline) {
        buffer.push("")
      }

      yield* Queue.offerAll(queue, buffer)
    })
  }

  private renderCauses(
    queue: Queue.Queue<string, Cause.Done>,
    diagnostic: Diagnostic,
    _parentSrc?: SourceCode,
  ) {
    const self = this
    return Effect.gen(function* () {
      const severity = diagnostic.severity
      const severityIcon = self.theme.diagnostic(severity)
      const iconIndent = self.colorizer.diagnostic(severity, severityIcon)
      const rootLines = self.collectLines(
        diagnostic.info,
        `  ${iconIndent} `,
        `  ${self.colorizer.diagnostic(severity, self.theme.vbar)} `,
      )

      let emitted = rootLines.length > 0
      if (rootLines.length > 0) {
        yield* Queue.offerAll(queue, rootLines)
      }

      if (!self.withCauseChain) {
        if (emitted) yield* Queue.offer(queue, "")
        return
      }

      const causes = self.collectCauses(diagnostic.diagnosticSource)
      for (const [index, cause] of causes.entries()) {
        const isLast = index === causes.length - 1
        const branch = isLast ? self.theme.lbot : self.theme.lcross
        const branchPrefix = `${branch}${self.theme.hbar}${self.theme.rarrow}`
        const initialIndent = `  ${self.colorizer.diagnostic(severity, branchPrefix)} `
        const restGlyph = isLast ? " " : self.theme.vbar
        const subsequentIndent = `  ${self.colorizer.diagnostic(severity, restGlyph)}   `

        const causeLines = self.collectLines(
          cause.info,
          initialIndent,
          subsequentIndent,
        )

        if (causeLines.length > 0) {
          yield* Queue.offerAll(queue, causeLines)
          emitted = true
        }
      }

      if (emitted) {
        yield* Queue.offer(queue, "")
      }
    })
  }

  private collectCauses(diagnostic?: Diagnostic | null): Array<Diagnostic> {
    const causes: Diagnostic[] = []
    let current: Diagnostic | null | undefined = diagnostic
    while (current != null) {
      causes.push(current)
      current = current.diagnosticSource ?? null
    }
    return causes
  }

  private collectLines(
    text: string,
    initialIndent: string,
    subsequentIndent: string,
  ) {
    const lines: string[] = []
    const trimmedInitial = this.trimTrailingCache(initialIndent)
    const trimmedSub = this.trimTrailingCache(subsequentIndent)
    const textLength = text.length
    let start = 0
    let index = 0

    while (start <= textLength) {
      const end = text.indexOf("\n", start)
      const sliceEnd = end === -1 ? textLength : end
      const line = text.slice(start, sliceEnd)
      const isFirst = index === 0
      const isBlank = this.isWhitespaceOnly(line)

      const prefix =
        isFirst && isBlank
          ? trimmedInitial
          : isFirst
            ? initialIndent
            : isBlank
              ? trimmedSub
              : subsequentIndent

      lines.push(`${prefix}${line}`)
      index += 1

      if (end === -1) break
      start = end + 1
    }

    if (textLength > 0 && text.charCodeAt(textLength - 1) === 10) {
      lines.push("")
    }

    return lines
  }

  private isWhitespaceOnly(value: string) {
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i)
      if (code !== 32 && code !== 9 && code !== 10 && code !== 13) {
        return false
      }
    }
    return true
  }

  private trimTrailingCache(value: string) {
    let trimmed = this.cachedTrims.get(value)
    if (trimmed === undefined) {
      trimmed = value.trimEnd()
      this.cachedTrims.set(value, trimmed)
    }
    return trimmed
  }

  private readonly cachedTrims = new Map<string, string>()
}
