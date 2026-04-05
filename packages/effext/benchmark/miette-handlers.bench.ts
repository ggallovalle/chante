import { Effect, Stream } from "effect"
import { bench, describe } from "vitest"
import { NoopHighlighter } from "~/miette/highlihter/noop.js"
import {
  Diagnostic,
  GraphicalReportHandler,
  JsonReportHandler,
  LabeledSpan,
  NarratableReportHandler,
  OptimizedGraphicalReportHandler,
  SourceSpan,
  StringSourceCode,
  ThemeCharacters,
} from "~/miette.js"
import { NoopColorizer } from "~/uwu.js"

const theme = ThemeCharacters.unicode()
const colorizer = new NoopColorizer()

const graphicalHandler = GraphicalReportHandler.themed(
  theme,
  colorizer,
  new NoopHighlighter(),
)
const optimizedHandler = OptimizedGraphicalReportHandler.themed(
  theme,
  colorizer,
)
const narratableHandler = NarratableReportHandler.default()
const jsonHandler = JsonReportHandler.default()

const runHandler = (
  handler: { renderReport: (d: Diagnostic) => Stream.Stream<string> },
  diagnostic: Diagnostic,
) => Effect.runSync(handler.renderReport(diagnostic).pipe(Stream.runDrain))

const mediumText = "host=localhost\nport=8080\nmode=prod\n"
const mediumSource = new StringSourceCode(mediumText)
const mediumPrimary = SourceSpan.from(
  mediumText.indexOf("port=8080"),
  "port=8080".length,
)
const mediumSecondary = SourceSpan.from(
  mediumText.indexOf("host=localhost"),
  "host=localhost".length,
)

const makeMediumDiagnostic = () =>
  new Diagnostic({
    severity: "warning",
    code: "ECONF",
    labels: [
      LabeledSpan.primaryFromSpan("port must be numeric", mediumPrimary),
      LabeledSpan.fromSpan("configured host", mediumSecondary),
    ],
    sourceCode: mediumSource,
    help: "Update port to an integer value",
    url: "https://example.com/docs/config#port",
    diagnosticSource: new Diagnostic({
      severity: "advice",
      labels: [LabeledSpan.message("loaded from /etc/app.conf")],
    }),
  })

const largeSourceText = `function main() {\n  connectDb({ host: "db", port: "abc" })\n  startWorker({ queue: "critical", concurrency: 2 })\n  return 0\n}`
const largeSource = new StringSourceCode(largeSourceText)
const connectOffset = largeSourceText.indexOf("connectDb")
const startOffset = largeSourceText.indexOf("startWorker")
const largePrimary = SourceSpan.from(
  connectOffset,
  'connectDb({ host: "db", port: "abc" })'.length,
)
const largeSecondary = SourceSpan.from(
  startOffset,
  'startWorker({ queue: "critical", concurrency: 2 })'.length,
)

const makeCause = (
  message: string,
  severity: "error" | "warning" | "advice",
  diagnosticSource?: Diagnostic,
) =>
  new Diagnostic({
    severity,
    labels: [LabeledSpan.message(message)],
    diagnosticSource,
  })

const makeLargeDiagnostic = () => {
  const deepest = makeCause("network unreachable after retries", "error")
  const mid = makeCause(
    "db handshake failed: bad credentials",
    "error",
    deepest,
  )
  const inner = makeCause("migration step timed out", "warning", mid)

  return new Diagnostic({
    severity: "error",
    code: "ESERVICE",
    labels: [
      LabeledSpan.primaryFromSpan("database connection failed", largePrimary),
      LabeledSpan.fromSpan("worker pool degraded", largeSecondary),
    ],
    sourceCode: largeSource,
    help: "Verify database credentials and worker configuration",
    url: "https://example.com/docs/service",
    diagnosticSource: inner,
  })
}

describe("miette handlers - medium", () => {
  bench("Graphical", () => runHandler(graphicalHandler, makeMediumDiagnostic()))
  bench("OptimizedGraphical", () =>
    runHandler(optimizedHandler, makeMediumDiagnostic()),
  )
  bench("Narratable", () =>
    runHandler(narratableHandler, makeMediumDiagnostic()),
  )
  bench("Json", () => runHandler(jsonHandler, makeMediumDiagnostic()))
})

describe("miette handlers - large", () => {
  bench("Graphical", () => runHandler(graphicalHandler, makeLargeDiagnostic()))
  bench("OptimizedGraphical", () =>
    runHandler(optimizedHandler, makeLargeDiagnostic()),
  )
  bench("Narratable", () =>
    runHandler(narratableHandler, makeLargeDiagnostic()),
  )
  bench("Json", () => runHandler(jsonHandler, makeLargeDiagnostic()))
})
