import {
  Diagnostic,
  GraphicalReportHandler,
  GraphicalTheme,
} from "@kbroom/effect-schema-miette"
import { NoopStyler } from "@kbroom/uwu"
import { Effect, Schema, Stream } from "effect"
import { assert, describe, fc, test } from "~test/fixtures.js"

const getReport = Effect.fnUntraced(function* (
  handler: GraphicalReportHandler,
  diagnostic: Diagnostic,
) {
  const report = yield* Stream.runCollect(handler.renderReport(diagnostic))

  const iterator = {
    index: 0,
    values: report,
    get done() {
      return this.index === this.values.length
    },
    next() {
      const value = this.values[this.index]
      this.index = this.index + 1
      return value
    },
  }

  return iterator
})

const baseHandler = GraphicalReportHandler.themed(
  GraphicalTheme.unicodeNoColor(new NoopStyler()),
)

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
          const report = yield* getReport(baseHandler, diagnostic)

          expect(report.next()).toEqual(`E0001 (${props.url})`)
        }),
      ),
    ))

  test("when options.link == none dont show the url", ({ expect, prop }) =>
    fc.assert(
      prop(
        [fc.string({ minLength: 4, maxLength: 15 })],
        Effect.fnUntraced(function* ([code]) {
          const handler = new GraphicalReportHandler({
            ...baseHandler,
            links: "none",
          })

          const diagnostic = new Diagnostic({
            info: "root hidden",
            code,
            url: "https://example.com/hidden",
            severity: "warning",
          })
          const report = yield* getReport(handler, diagnostic)

          expect(report.next()).toEqual(code)
        }),
      ),
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
        const report = yield* getReport(baseHandler, diagnostic)

        report.next()
        report.next()
        expect(report.next()).toEqual(message)
        expect(report.next()).toEqual("")
        assert(report.done)
      }),
    ))

  test("renders the cause chain", ({ expect, effect }) =>
    effect(
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

        const handler = new GraphicalReportHandler({
          ...baseHandler,
          links: "none",
        })
        const report = yield* getReport(handler, root)

        expect(report.next()).toEqual("  × root")
        expect(report.next()).toEqual("  ├─▶ inner")
        expect(report.next()).toEqual("  ╰─▶ inner-most")
        expect(report.next()).toEqual("")
        assert(report.done)
      }),
    ))
})
