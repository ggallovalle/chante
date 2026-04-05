import { Effect, Stream } from "effect"
import { bench, describe } from "vitest"
import {
  Diagnostic,
  GraphicalReportHandler,
  LabeledSpan,
  OptimizedGraphicalReportHandler,
  ThemeCharacters,
} from "~/miette.js"
import { NoopColorizer } from "~/uwu.js"

const colorizer = new NoopColorizer()

const deepest = new Diagnostic({
  severity: "error",
  code: "E-INNER-3",
  labels: [
    LabeledSpan.message(
      "deepest cause description spanning\nmultiple lines of context\nwith actionable hints",
    ),
  ],
})

const inner = new Diagnostic({
  severity: "error",
  code: "E-INNER-2",
  labels: [
    LabeledSpan.message(
      "inner cause info across\nthree lines to stress\nindentation formatting",
    ),
  ],
  diagnosticSource: deepest,
})

const mid = new Diagnostic({
  severity: "warning",
  code: "E-INNER-1",
  labels: [
    LabeledSpan.message(
      "mid cause contains\nseveral words and\nnewline characters\nfor wrapping",
    ),
  ],
  diagnosticSource: inner,
})

const root = new Diagnostic({
  severity: "error",
  code: "E-BENCH",
  url: "https://example.com/docs/error",
  labels: [
    LabeledSpan.message(
      "Primary diagnostic includes\nmultiple lines to measure\nindent processing and\nstring concatenation\non every iteration\nof the renderer.",
    ),
  ],
  diagnosticSource: mid,
  help: "Re-run with --verbose after clearing cache",
})

const themed = ThemeCharacters.unicode()
const baselineHandler = GraphicalReportHandler.themed(themed, colorizer)
const optimizedHandler = OptimizedGraphicalReportHandler.themed(
  themed,
  colorizer,
)

const runBaseline = () =>
  Effect.runSync(baselineHandler.renderReport(root).pipe(Stream.runDrain))

const runOptimized = () =>
  Effect.runSync(optimizedHandler.renderReport(root).pipe(Stream.runDrain))

describe("GraphicalReportHandler benchmarks", () => {
  bench("GraphicalReportHandler", () => runBaseline())
  bench("OptimizedGraphicalReportHandler", () => runOptimized())
})
