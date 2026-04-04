import { Effect, Schema, Stream } from "effect"
import {
  Diagnostic,
  GraphicalReportHandler,
  LabeledSpan,
  ThemeCharacters,
} from "~/miette"
import { NoopColorizer } from "~/uwu"
import { assertSome, describe, fc, test } from "~test/fixtures"

const colorizer = new NoopColorizer()

fc.configureGlobal({ numRuns: 20 })

const baseHandler = GraphicalReportHandler.themed(ThemeCharacters.unicode())
const noLinkHandler = new GraphicalReportHandler({
  ...baseHandler,
  links: "none",
})

describe("GraphicalReportHandler", () => {
  test("header includes the code and the url", ({ expect, prop }) =>
    fc.assert(
      prop(
        { url: Schema.URLFromString },
        Effect.fnUntraced(function* (props) {
          const diagnostic = new Diagnostic({
            code: "E0001",
            severity: "error",
            url: props.url.toString(),
          })
          const report = assertSome(
            yield* baseHandler
              .renderReport(diagnostic, colorizer)
              .pipe(Stream.runHead),
          )

          expect(report).toEqual(`E0001 (${props.url})`)
        }),
      ),
    ))

  test("when options.link == none dont show the url", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = new Diagnostic({
          code: "error::hidden",
          severity: "warning",
          url: "https://example.com/hidden",
        })
        const report = assertSome(
          yield* noLinkHandler
            .renderReport(diagnostic, colorizer)
            .pipe(Stream.runHead),
        )

        expect(report).toEqual("error::hidden")
      }),
    ))

  test.for([
    [
      "error",
      "  × file not found",
      new Diagnostic({
        severity: "error",
        code: "E0001",
        labels: [LabeledSpan.message("file not found")],
        url: "https://example.com",
      }),
    ],
    [
      "warning",
      "  ⚠ root hidden",
      new Diagnostic({
        severity: "warning",
        code: "E0002",
        labels: [LabeledSpan.message("root hidden")],
        url: "https://example.com/hidden",
      }),
    ],
    [
      "advice",
      "  ☞ file a complain",
      new Diagnostic({
        severity: "advice",
        code: "E0003",
        labels: [LabeledSpan.message("file a complain")],
        url: "https://example.com/whoami",
      }),
    ],
  ] as const)("renders the icon according to severity($0)", ([
    _,
    message,
    diagnostic,
  ], { expect, effect }) =>
    effect(
      Effect.gen(function* () {
        const report = yield* baseHandler
          .renderReport(diagnostic, colorizer)
          .pipe(Stream.runCollect)

        expect(report[2]).toEqual(message)
        expect(report[3]).toEqual("")
        expect(report[4]).toBeUndefined()
      }),
    ))

  test("renders the cause chain", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const deepest = new Diagnostic({
          severity: "error",
          labels: [LabeledSpan.message("inner-most")],
        })

        const inner = new Diagnostic({
          severity: "error",
          labels: [LabeledSpan.message("inner")],
          diagnosticSource: deepest,
        })

        const root = new Diagnostic({
          severity: "error",
          labels: [LabeledSpan.message("root")],
          diagnosticSource: inner,
        })

        const report = yield* noLinkHandler
          .renderReport(root, colorizer)
          .pipe(Stream.runCollect)

        expect(report[0]).toEqual("  × root")
        expect(report[1]).toEqual("  ├─▶ inner")
        expect(report[2]).toEqual("  ╰─▶ inner-most")
        expect(report[3]).toEqual("")
        expect(report[4]).toBeUndefined()
      }),
    ))
})
