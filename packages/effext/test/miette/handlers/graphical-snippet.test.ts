import { Effect, Stream } from "effect"
import {
  Diagnostic,
  GraphicalReportHandler,
  LabeledSpan,
  SourceSpan,
  StringSourceCode,
  ThemeCharacters,
} from "~/miette"
import { NoopHighlighter } from "~/miette/highlihter/noop.js"
import { NoopColorizer } from "~/uwu"
import { describe, test } from "~test/fixtures"

const colorizer = new NoopColorizer()
const handler = GraphicalReportHandler.themed(
  ThemeCharacters.unicode(),
  colorizer,
  new NoopHighlighter(),
)

const snippet = "node {\n  prop: \"value\"\n  flag: true\n}\n"
const source = new StringSourceCode(snippet)
const propSpan = SourceSpan.from(snippet.indexOf("prop"), "prop: \"value\"".length)
const flagOffset = snippet.indexOf("flag") + 2

const diagnostic = new Diagnostic({
  severity: "error",
  labels: [
    LabeledSpan.primaryFromSpan("prop label", propSpan),
    LabeledSpan.atOffset(flagOffset, "flag caret"),
  ],
  sourceCode: source,
})

describe("GraphicalReportHandler snippet output", () => {
  const collect = Effect.gen(function* () {
    return yield* handler
      .renderReport(diagnostic)
      .pipe(Stream.runCollect)
  })

  test("renders snippet header, gutter, and underline", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const report = yield* collect
        const body = report.join("\n")

        expect(body).toContain("╭─[source")
        expect(body).toContain('1 │ node {')
        expect(body).toContain('2 │   prop: "value"')
        expect(body).toContain("prop label")
      }),
    ))

  test("renders caret arrow and label for zero-length span", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const report = yield* collect
        const body = report.join("\n")

        expect(body).toContain("▲")
        expect(body).toContain("flag caret")
      }),
    ))
})
