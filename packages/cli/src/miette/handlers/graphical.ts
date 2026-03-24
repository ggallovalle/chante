import { Stream, Effect, Schema, Queue, Cause } from "effect"
import { GraphicalTheme } from "./theme.js"
import { Diagnostic } from "../diagnostic.js"
import { SourceCode } from "../source-code.js"
import { Styled } from "../../colors.js"

export const LinkStyle = Schema.Literals(["link", "text", "none"])
export type LinkStyle = Schema.Schema.Type<typeof LinkStyle>


export class GraphicalReportHandler extends Schema.Class<GraphicalReportHandler>("GraphicalReportHandler")({
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

  public renderReport(diagnostic: Diagnostic) {
    const self = this
    return Stream.callback<string>((queue) => {
      return Effect.gen(function*() {
        // yield* Queue.offer(queue, "render-report")
        yield* self.renderReportInner(queue, diagnostic, diagnostic.sourceCode)
        yield* Queue.end(queue)
      })
    })
  }

  private renderReportInner(queue: Queue.Queue<string, Cause.Done>, diagnostic: Diagnostic, parentSrc?: SourceCode) {
    const self = this
    return Effect.gen(function*() {
      const _src: SourceCode | undefined = diagnostic.sourceCode ?? parentSrc
      yield* self.renderHeader(queue, diagnostic, false)
    })
  }

  private renderHeader(queue: Queue.Queue<string, Cause.Done>, diagnostic: Diagnostic, isNested: boolean) {
    const self = this
    return Effect.gen(function*() {
      let needNewline = isNested

      const severityStyle: Styled = (() => {
        switch (diagnostic.severity) {
          case "warning":
            return self.theme.styles.warning
          case "advice":
            return self.theme.styles.advice
          case "error":
          default:
            return self.theme.styles.error
        }
      })()

      // Link style OSC 8 hyperlink
      if (self.links === "link" && diagnostic.url) {
        const code = diagnostic.code ? severityStyle.stiled(diagnostic.code) + " " : ""
        const displayText = self.linkDisplayText ?? "(link)"
        const linkStyled = self.theme.styles.link.stiled(displayText)
        const line = `\u001b]8;;${diagnostic.url}\u001b\\${code}${linkStyled}\u001b]8;;\u001b\\`
        yield* Queue.offer(queue, line)
        needNewline = true
      } else if (diagnostic.code) {
        let line = severityStyle.stiled(diagnostic.code)
        if (self.links === "text" && diagnostic.url) {
          line += ` (${self.theme.styles.link.stiled(diagnostic.url)})`
        }
        yield* Queue.offer(queue, line)
        needNewline = true
      }

      if (needNewline) {
        yield* Queue.offer(queue, "")
      }
    })
  }
}

