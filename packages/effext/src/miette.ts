export { Diagnostic, isDiagnostic, type Severity } from "~/miette/diagnostic.js"
export {
  IoError,
  isMietteError,
  type MietteError,
  OutOfBounds,
} from "~/miette/error.js"
export {
  GraphicalReportHandler,
  OptimizedGraphicalReportHandler,
} from "~/miette/handlers/graphical.js"
export {
  type IReportHandler,
  MietteHandlerOpts,
  ReportHandler,
  TypeId as ReportHandlerTypeId,
} from "~/miette/handlers/handler.js"
export { JsonReportHandler } from "~/miette/handlers/json.js"
export { NarratableReportHandler } from "~/miette/handlers/narratable.js"
export { ThemeCharacters } from "~/miette/handlers/theme.js"
export {
  Highlighter,
  type IHighlighter,
  layer as noopHighlighterLayer,
  NoopHighlighter,
} from "~/miette/highlihter/noop.js"
export {
  layer as shikiHighlighterLayer,
  ShikiHighlighter,
} from "~/miette/highlihter/shiki.js"
export {
  LabeledSpan,
  SourceSpan,
  SpanContents,
} from "~/miette/protocol.js"
export {
  FromFileSourceCode,
  SourceCode,
  StringSourceCode,
} from "~/miette/source-code.js"

import { Effect, Layer, Stdio } from "effect"
import { GraphicalReportHandler } from "~/miette/handlers/graphical.js"
import {
  type IReportHandler,
  ReportHandler,
} from "~/miette/handlers/handler.js"
import { JsonReportHandler } from "~/miette/handlers/json.js"
import { NarratableReportHandler } from "~/miette/handlers/narratable.js"
import {
  Highlighter,
  layer as highlighterLayer,
} from "~/miette/highlihter/noop.js"
import {
  Colorizer,
  type IColorizer,
  TerminalColors,
  layer as uwuLayer,
} from "~/uwu.js"

const selectReportHandler = (
  args: ReadonlyArray<string>,
  isTTY: boolean,
  colorizer: IColorizer,
  highlighter: import("~/miette/highlihter/noop.js").IHighlighter,
): IReportHandler => {
  let mode: "json" | "pretty" | undefined

  for (let i = 0; i < args.length; i++) {
    // biome-ignore lint/style/noNonNullAssertion: I know
    const arg = args[i]!
    if (!arg.startsWith("--output")) continue

    const eq = arg.indexOf("=")
    const value = eq !== -1 ? arg.slice(eq + 1) : args[i + 1]

    if (value === "json" || value === "pretty") {
      mode = value
      break
    }
  }

  if (mode === "json") return JsonReportHandler.default()

  return isTTY
    ? GraphicalReportHandler.default(colorizer, highlighter)
    : NarratableReportHandler.default()
}

const handlerLayer = Layer.effect(
  ReportHandler,
  Effect.gen(function* () {
    const stdio = yield* Stdio.Stdio
    const args = yield* stdio.args
    const term = yield* TerminalColors
    const colorizer = yield* Colorizer
    const highlighter = yield* Highlighter
    const handler = selectReportHandler(
      args,
      term.isTTY,
      colorizer,
      highlighter,
    )
    return handler
  }),
)

export const layer = Layer.provideMerge(
  handlerLayer,
  Layer.merge(uwuLayer, highlighterLayer),
)

export const META_DIAGNOSTIC = "mietteDiagnostic"
