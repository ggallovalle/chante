import { Effect, Stream } from "effect"
import {
  Diagnostic,
  FromFileSourceCode,
  LabeledSpan,
  NarratableReportHandler,
  SourceSpan,
  StringSourceCode,
} from "~/miette"
import { describe, test } from "~test/fixtures"

const handler = NarratableReportHandler.default()

describe("NarratableReportHandler", () => {
  test("renders a configuration error with file location and snippet", ({
    expect,
    effect,
  }) =>
    effect(
      Effect.gen(function* () {
        const content = "host=localhost\nport=abcd\nmode=prod"
        const source = new FromFileSourceCode(
          "fs",
          "/etc/app.conf",
          "app.conf",
          "conf",
          new StringSourceCode(content),
        )
        const diagnostic = new Diagnostic({
          severity: "error",
          code: "ECONF",
          labels: [
            LabeledSpan.primaryFromSpan(
              "port must be a number",
              SourceSpan.from(15, 9),
            ),
          ],
          sourceCode: source,
        })

        const lines = yield* handler
          .renderReport(diagnostic)
          .pipe(Stream.runCollect)

        expect(lines[0]).toEqual("error: ECONF port must be a number")
        expect(lines[1]).toEqual("at app.conf line 2, col 1 (offset 15, len 9)")
        expect(lines[2]).toEqual('snippet: "port=abcd"')
        expect(lines[3]).toEqual("label: port must be a number")
      }),
    ))

  test("includes cause chain for wrapped failures", ({ expect, effect }) =>
    effect(
      Effect.gen(function* () {
        const leaf = new Diagnostic({
          severity: "error",
          labels: [LabeledSpan.message("database connection refused")],
        })
        const root = new Diagnostic({
          severity: "error",
          labels: [LabeledSpan.message("failed to start service")],
          diagnosticSource: leaf,
        })

        const lines = yield* handler.renderReport(root).pipe(Stream.runCollect)

        expect(lines[0]).toEqual("error: failed to start service")
        expect(lines[1]).toEqual("caused by: database connection refused")
      }),
    ))

  test("appends help and url to the narrative", ({ expect, effect }) =>
    effect(
      Effect.gen(function* () {
        const diagnostic = new Diagnostic({
          severity: "warning",
          code: "EUPSTREAM",
          labels: [LabeledSpan.message("upstream returned 429")],
          help: "Retry with exponential backoff",
          url: "https://example.com/docs/retries",
        })

        const lines = yield* handler
          .renderReport(diagnostic)
          .pipe(Stream.runCollect)

        expect(lines[0]).toEqual("warning: EUPSTREAM upstream returned 429")
        expect(lines).toContain("help: Retry with exponential backoff")
        expect(lines).toContain("see: https://example.com/docs/retries")
      }),
    ))

  test("omits snippet for zero-length spans but still reports position", ({
    expect,
    effect,
  }) =>
    effect(
      Effect.gen(function* () {
        const source = new StringSourceCode('throw new Error("boom")')
        const diagnostic = new Diagnostic({
          severity: "error",
          labels: [
            LabeledSpan.primaryFromSpan("throw site", SourceSpan.from(0, 0)),
          ],
          sourceCode: source,
        })

        const lines = yield* handler
          .renderReport(diagnostic)
          .pipe(Stream.runCollect)

        expect(lines[1]).toEqual("at source line 1, col 1 (offset 0, len 0)")
        expect(
          lines.find((line) => line?.startsWith("snippet")),
        ).toBeUndefined()
      }),
    ))
})
