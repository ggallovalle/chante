import { describe, assert } from "vitest"
import { Effect, Stream } from "effect"
import { test } from "../../fixtures.js"
import { GraphicalReportHandler } from "../../../src/miette/handlers/graphical.js"
import { GraphicalTheme } from "../../../src/miette/handlers/theme.js"
import { Diagnostic } from "../../../src/miette/diagnostic.js"

const getReport = Effect.fnUntraced(function*(handler: GraphicalReportHandler, diagnostic: Diagnostic) {
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
    }
  }

  return iterator
})

const baseHandler = GraphicalReportHandler.themed(GraphicalTheme.unicodeNoColor())

describe("GraphicalReportHandler", () => {
  test("header includes the code and the url", ({ expect, effect }) =>
    effect(Effect.gen(function*() {
      const diagnostic = new Diagnostic({
        message: "root",
        code: "E0001",
        url: "https://example.com",
        severity: "error"
      })
      const report = yield* getReport(baseHandler, diagnostic)

      expect(report.next()).toEqual("E0001 (https://example.com)")
      expect(report.next()).toEqual("")
      expect(report.next()).toEqual("  × root")
      expect(report.next()).toEqual("")
      assert(report.done)
    }))
  )

  test("when options.link == none dont show the url", ({ expect, effect }) =>
    effect(Effect.gen(function*() {
      const handler = new GraphicalReportHandler({ ...baseHandler, links: "none" })

      const diagnostic = new Diagnostic({
        message: "root hidden",
        code: "E0002",
        url: "https://example.com/hidden",
        severity: "warning"
      })
      const report = yield* getReport(handler, diagnostic)

      expect(report.next()).toEqual("E0002")
      expect(report.next()).toEqual("")
      expect(report.next()).toEqual("  × root hidden")
      expect(report.next()).toEqual("")
      assert(report.done)
    }))
  )

  test("renders the cause chain", ({ expect, effect }) =>
    effect(Effect.gen(function*() {
      const deepest = new Diagnostic({
        message: "inner-most",
        severity: "error"
      })

      const inner = new Diagnostic({
        message: "inner",
        diagnosticSource: deepest,
        severity: "error"
      })

      const root = new Diagnostic({
        message: "root",
        diagnosticSource: inner,
        severity: "error"
      })

      const handler = new GraphicalReportHandler({ ...baseHandler, links: "none" })
      const report = yield* getReport(handler, root)

      expect(report.next()).toEqual("  × root")
      expect(report.next()).toEqual("  ├─▶ inner")
      expect(report.next()).toEqual("  ╰─▶ inner-most")
      expect(report.next()).toEqual("")
      assert(report.done)
    }))
  )
})
