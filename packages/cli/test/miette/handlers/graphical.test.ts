import { describe } from "vitest"
import { Effect, Stream } from "effect"
import { test } from "../../fixtures.js"
import { GraphicalReportHandler } from "../../../src/miette/handlers/graphical.js"
import { Diagnostic } from "../../../src/miette/diagnostic.js"

describe("GraphicalReportHandler", () => {
  test("renderReport emits items in order", ({ expect, effect }) =>
    effect(Effect.gen(function*() {
      const handler = GraphicalReportHandler.default()
      const diagnostic = new Diagnostic({})

      const report = yield* Stream.runCollect(
        handler.renderReport(diagnostic),
      )

      expect(report).toEqual([
        "hello world",
        "hello world",
        "hello inner",
        "hello inner",
        "hello header",
        "hello header",
      ])
    }))
  )
})
