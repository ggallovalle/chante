import { Effect, Stream } from "effect"
import type { Diagnostic } from "../diagnostic.js"
import type { LabeledSpan } from "../protocol.js"
import type { SourceCode } from "../source-code.js"
import { type IReportHandler, TypeId } from "./handler.js"

type SpanContext = {
  label: LabeledSpan
  source: SourceCode
}

export class NarratableReportHandler implements IReportHandler {
  public readonly [TypeId] = TypeId

  public static default() {
    return new NarratableReportHandler()
  }

  public renderReport(diagnostic: Diagnostic): Stream.Stream<string> {
    return Stream.fromEffect(this.linesFor(diagnostic)).pipe(
      Stream.orDie,
      Stream.flatMap((lines) => Stream.fromIterable(lines)),
    )
  }

  private linesFor(diagnostic: Diagnostic) {
    return Effect.gen(function* () {
      const lines: Array<string> = []

      const message = NarratableReportHandler.formatMessage(diagnostic)
      lines.push(message)

      const spanContext = NarratableReportHandler.primarySpan(diagnostic)
      if (spanContext !== undefined) {
        const location =
          yield* NarratableReportHandler.formatLocation(spanContext)
        if (location !== undefined) {
          lines.push(location)
        }

        const snippet =
          yield* NarratableReportHandler.formatSnippet(spanContext)
        if (snippet !== undefined) {
          lines.push(snippet)
        }

        const labelText = spanContext.label.label ?? diagnostic.info
        if (labelText !== undefined) {
          lines.push(`label: ${labelText}`)
        }
      }

      for (const cause of NarratableReportHandler.collectCauses(
        diagnostic.diagnosticSource,
      )) {
        lines.push(`caused by: ${cause.info}`)
      }

      if (diagnostic.help !== undefined) {
        lines.push(`help: ${diagnostic.help}`)
      }

      if (diagnostic.url !== undefined) {
        lines.push(`see: ${diagnostic.url}`)
      }

      return lines
    })
  }

  private static formatMessage(diagnostic: Diagnostic): string {
    const severity = diagnostic.severity ?? "error"
    const code = diagnostic.code !== undefined ? `${diagnostic.code} ` : ""
    return `${severity}: ${code}${diagnostic.info}`
  }

  private static primarySpan(diagnostic: Diagnostic): SpanContext | undefined {
    const label =
      diagnostic.labels?.find((l) => l.primary) ?? diagnostic.labels?.[0]
    if (label === undefined) return undefined
    const source = diagnostic.sourceCode
    if (source === undefined) return undefined
    return { label, source }
  }

  private static formatLocation({ label, source }: SpanContext) {
    return source.readSpan(label.span, 0, 0).pipe(
      Effect.match({
        onFailure: () => undefined,
        onSuccess: (span) => {
          const line = span.line + 1
          const column = span.column + 1
          const name = span.name ?? "source"
          return `at ${name} line ${line}, col ${column} (offset ${label.offset}, len ${label.len})`
        },
      }),
    )
  }

  private static formatSnippet({ label, source }: SpanContext) {
    if (label.len === 0) return Effect.succeed<undefined>(undefined)
    return source.readSpan(label.span, 0, 0).pipe(
      Effect.match({
        onFailure: () => undefined,
        onSuccess: (span) => {
          const decoded = new TextDecoder().decode(span.data)
          const sanitized = decoded.replace(/\n/g, "\\n")
          const snippet = NarratableReportHandler.truncate(sanitized, 120)
          return `snippet: "${snippet}"`
        },
      }),
    )
  }

  private static truncate(value: string, max: number): string {
    if (value.length <= max) return value
    return `${value.slice(0, max)}…`
  }

  private static collectCauses(diagnostic?: Diagnostic): Array<Diagnostic> {
    const result: Array<Diagnostic> = []
    let current = diagnostic
    while (current !== undefined) {
      result.push(current)
      current = current.diagnosticSource
    }
    return result
  }
}
