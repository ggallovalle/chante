/** @effect-diagnostics preferSchemaOverJson:skip-file */
import { Effect, Stream } from "effect"
import {
  Diagnostic,
  JsonReportHandler,
  LabeledSpan,
  SourceSpan,
} from "~/miette"
import { assertSome, describe, test } from "~test/fixtures"

const handler = JsonReportHandler.default()

describe("JsonReportHandler", () => {
  test("renders basic diagnostic fields", ({ expect, effect }) =>
    effect(
      Effect.gen(function* () {
        const diagnostic = new Diagnostic({
          severity: "warning",
          code: "EJSON1",
          labels: [LabeledSpan.message("boom")],
          url: "https://example.com",
          help: "do something",
        })

        const json = assertSome(
          yield* handler.renderReport(diagnostic).pipe(Stream.runHead),
        )

        const parsed = JSON.parse(json)
        expect(parsed.message).toEqual("boom")
        expect(parsed.code).toEqual("EJSON1")
        expect(parsed.severity).toEqual("warning")
        expect(parsed.url).toEqual("https://example.com")
        expect(parsed.help).toEqual("do something")
        expect(parsed.causes).toEqual([])
        expect(parsed.filename).toEqual("")
        expect(parsed.labels).toEqual([
          { label: "boom", span: { offset: 0, length: 0 } },
        ])
        expect(parsed.related).toEqual([])
      }),
    ))

  test("includes cause chain", ({ expect, effect }) =>
    effect(
      Effect.gen(function* () {
        const inner = new Diagnostic({
          severity: "error",
          labels: [LabeledSpan.message("inner cause")],
        })
        const root = new Diagnostic({
          severity: "error",
          labels: [LabeledSpan.message("root cause")],
          diagnosticSource: inner,
        })

        const json = assertSome(
          yield* handler.renderReport(root).pipe(Stream.runHead),
        )
        const parsed = JSON.parse(json)
        expect(parsed.causes).toEqual(["inner cause"])
      }),
    ))

  test("serializes related diagnostics", ({ expect, effect }) =>
    effect(
      Effect.gen(function* () {
        const related = new Diagnostic({
          severity: "advice",
          labels: [LabeledSpan.message("extra info")],
        })
        const root = new Diagnostic({
          severity: "error",
          labels: [LabeledSpan.message("root")],
          related: [related],
        })

        const json = assertSome(
          yield* handler.renderReport(root).pipe(Stream.runHead),
        )
        const parsed = JSON.parse(json)
        expect(parsed.related).toHaveLength(1)
        expect(parsed.related[0].message).toEqual("extra info")
        expect(parsed.related[0].severity).toEqual("advice")
      }),
    ))

  test("preserves span offsets and lengths", ({ expect, effect }) =>
    effect(
      Effect.gen(function* () {
        const span = SourceSpan.from(5, 3)
        const diagnostic = new Diagnostic({
          severity: "error",
          labels: [LabeledSpan.fromSpan("range", span)],
        })

        const json = assertSome(
          yield* handler.renderReport(diagnostic).pipe(Stream.runHead),
        )
        const parsed = JSON.parse(json)
        expect(parsed.labels[0]).toEqual({
          label: "range",
          span: { offset: 5, length: 3 },
        })
      }),
    ))

  test("escapes quotes and backslashes", ({ expect, effect }) =>
    effect(
      Effect.gen(function* () {
        const diagnostic = new Diagnostic({
          severity: "error",
          labels: [LabeledSpan.message('bad "quote" \\ slash')],
        })

        const json = assertSome(
          yield* handler.renderReport(diagnostic).pipe(Stream.runHead),
        )

        expect(() => JSON.parse(json)).not.toThrow()
        const parsed = JSON.parse(json)
        expect(parsed.message).toEqual('bad "quote" \\ slash')
      }),
    ))
})
