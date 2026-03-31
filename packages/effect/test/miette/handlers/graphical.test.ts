import { Effect, Schema, Stream } from "effect"
import { Diagnostic, GraphicalReportHandler, ThemeCharacters } from "~/miette"
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
            info: "root",
            code: "E0001",
            url: props.url.toString(),
            severity: "error",
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
          info: "root hidden",
          code: "error::hidden",
          url: "https://example.com/hidden",
          severity: "warning",
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
        info: "file not found",
        code: "E0001",
        url: "https://example.com",
        severity: "error",
      }),
    ],
    [
      "warning",
      "  ⚠ root hidden",
      new Diagnostic({
        info: "root hidden",
        code: "E0002",
        url: "https://example.com/hidden",
        severity: "warning",
      }),
    ],
    [
      "advice",
      "  ☞ file a complain",
      new Diagnostic({
        info: "file a complain",
        code: "E0003",
        url: "https://example.com/whoami",
        severity: "advice",
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
          info: "inner-most",
          severity: "error",
        })

        const inner = new Diagnostic({
          info: "inner",
          diagnosticSource: deepest,
          severity: "error",
        })

        const root = new Diagnostic({
          info: "root",
          diagnosticSource: inner,
          severity: "error",
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
