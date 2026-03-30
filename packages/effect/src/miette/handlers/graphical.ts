import { type Cause, Effect, Queue, Schema, Stream } from "effect"
import wrapAnsi from "wrap-ansi"
import type { IStyler } from "~/uwu"
import type { Diagnostic } from "../diagnostic.js"
import type { SourceCode } from "../source-code.js"
import { GraphicalTheme, type ThemeStyles } from "./theme.js"

export const LinkStyle = Schema.Literals(["link", "text", "none"])
export type LinkStyle = Schema.Schema.Type<typeof LinkStyle>

export class GraphicalReportHandler extends Schema.Class<GraphicalReportHandler>(
  "GraphicalReportHandler",
)({
  links: LinkStyle,
  termwidth: Schema.Number,
  theme: GraphicalTheme,
  footer: Schema.optional(Schema.String),
  contextLines: Schema.Number,
  tabWidth: Schema.Number,
  withCauseChain: Schema.Boolean,
  wrapLines: Schema.Boolean,
  breakWords: Schema.Boolean,
  withPrimarySpanStart: Schema.Boolean,
  linkDisplayText: Schema.optional(Schema.String),
  showRelatedAsNested: Schema.Boolean,
}) {
  public static default() {
    return new GraphicalReportHandler({
      links: "text",
      termwidth: 200,
      theme: GraphicalTheme.default(),
      footer: undefined,
      contextLines: 3,
      tabWidth: 3,
      withCauseChain: true,
      wrapLines: true,
      breakWords: true,
      withPrimarySpanStart: true,
      linkDisplayText: "(link)",
      showRelatedAsNested: false,
    })
  }

  public static themed(theme: GraphicalTheme) {
    return new GraphicalReportHandler({
      links: "text",
      termwidth: 200,
      theme,
      footer: undefined,
      contextLines: 3,
      tabWidth: 3,
      withCauseChain: true,
      wrapLines: true,
      breakWords: true,
      withPrimarySpanStart: true,
      linkDisplayText: "(link)",
      showRelatedAsNested: false,
    })
  }

  public renderReport(diagnostic: Diagnostic, styler: IStyler) {
    const self = this
    return Stream.callback<string>((queue) => {
      return Effect.gen(function* () {
        const colorer = self.theme.styles.buildColorer(styler)
        // yield* Queue.offer(queue, "render-report")
        yield* self.renderReportInner(
          queue,
          diagnostic,
          colorer,
          diagnostic.sourceCode,
        )
        yield* Queue.end(queue)
      })
    })
  }

  private renderReportInner(
    queue: Queue.Queue<string, Cause.Done>,
    diagnostic: Diagnostic,
    colorer: ReturnType<ThemeStyles["buildColorer"]>,
    parentSrc?: SourceCode,
  ) {
    const self = this
    return Effect.gen(function* () {
      const src: SourceCode | undefined = diagnostic.sourceCode ?? parentSrc
      yield* self.renderHeader(queue, diagnostic, colorer, false)
      yield* self.renderCauses(queue, diagnostic, colorer, src)
    })
  }

  private renderHeader(
    queue: Queue.Queue<string, Cause.Done>,
    diagnostic: Diagnostic,
    colorer: ReturnType<ThemeStyles["buildColorer"]>,
    isNested: boolean,
  ) {
    const self = this
    return Effect.gen(function* () {
      let needNewline = isNested

      const severityStyle = colorer.pickFromSeverity(diagnostic.severity)

      // Link style OSC 8 hyperlink
      if (self.links === "link" && diagnostic.url) {
        const code = diagnostic.code ? `${severityStyle(diagnostic.code)} ` : ""
        const displayText = self.linkDisplayText ?? "(link)"
        const linkStyled = colorer.link(displayText)
        const line = `\u001b]8;;${diagnostic.url}\u001b\\${code}${linkStyled}\u001b]8;;\u001b\\`
        yield* Queue.offer(queue, line)
        needNewline = true
      } else if (diagnostic.code) {
        let line = severityStyle(diagnostic.code)
        if (self.links === "text" && diagnostic.url) {
          line += ` (${colorer.link(diagnostic.url)})`
        }
        yield* Queue.offer(queue, line)
        needNewline = true
      }

      if (needNewline) {
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

  private wrapText(
    text: string,
    opts: {
      initialIndent: string
      subsequentIndent: string
      width: number
      wrapLines: boolean
      breakWords: boolean
    },
  ) {
    const { initialIndent, subsequentIndent, width, wrapLines, breakWords } =
      opts

    const lines: string[] = []

    if (wrapLines) {
      const wrapped = wrapAnsi(text, Math.max(0, width), {
        hard: breakWords,
        trim: false,
      })

      wrapped.split("\n").forEach((line, idx) => {
        lines.push(`${idx === 0 ? initialIndent : subsequentIndent}${line}`)
      })

      return lines
    }

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

  private renderCauses(
    queue: Queue.Queue<string, Cause.Done>,
    diagnostic: Diagnostic,
    colorer: ReturnType<ThemeStyles["buildColorer"]>,
    _parentSrc?: SourceCode,
  ) {
    const self = this
    return Effect.gen(function* () {
      const severityStyle = colorer.pickFromSeverity(diagnostic.severity)
      const severityIcon = (() => {
        switch (diagnostic.severity) {
          case "warning":
            return self.theme.characters.warning
          case "advice":
            return self.theme.characters.advice
          default:
            return self.theme.characters.error
        }
      })()

      let emitted = false
      const width = Math.max(0, self.termwidth - 2)

      const iconIndent = `${severityStyle(`${severityIcon}`)}`
      const rootLines = self.wrapText(diagnostic.info, {
        initialIndent: `  ${iconIndent} `,
        subsequentIndent: `  ${severityStyle(self.theme.characters.vbar)} `,
        width,
        wrapLines: self.wrapLines,
        breakWords: self.breakWords,
      })

      for (const line of rootLines) {
        yield* Queue.offer(queue, line)
        emitted = true
      }

      if (!self.withCauseChain) {
        if (emitted) yield* Queue.offer(queue, "")
        return
      }

      const causes = self.collectCauses(diagnostic.diagnosticSource)

      for (const [index, cause] of causes.entries()) {
        const isLast = index === causes.length - 1
        const branch = isLast
          ? self.theme.characters.lbot
          : self.theme.characters.lcross
        const branchPrefix = `${branch}${self.theme.characters.hbar}${self.theme.characters.rarrow}`
        const initialIndent = `  ${severityStyle(branchPrefix)} `
        const restGlyph = isLast ? " " : self.theme.characters.vbar
        const subsequentIndent = `  ${severityStyle(restGlyph)}   `
        const availableWidth = Math.max(0, width - subsequentIndent.length)

        const wrapped = self.wrapText(cause.info, {
          initialIndent,
          subsequentIndent,
          width: availableWidth,
          wrapLines: self.wrapLines,
          breakWords: self.breakWords,
        })

        for (const line of wrapped) {
          yield* Queue.offer(queue, line)
          emitted = true
        }
      }

      if (emitted) {
        yield* Queue.offer(queue, "")
      }
    })
  }
}
