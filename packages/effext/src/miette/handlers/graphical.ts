import { type Cause, Effect, Queue, Stream } from "effect"
import type { IColorizer } from "~/uwu.js"
import { NoopColorizer } from "~/uwu.js"
import type { Diagnostic } from "../diagnostic.js"
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

  constructor(options: {
    links: LinkStyle
    theme: ThemeCharacters
    footer?: string | undefined
    withCauseChain: boolean
    linkDisplayText?: string | undefined
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
    })
  }

  public static themed(
    theme: ThemeCharacters,
    colorizer: IColorizer = new NoopColorizer(),
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
