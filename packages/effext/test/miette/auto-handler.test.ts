/** @effect-diagnostics preferSchemaOverJson:skip-file */
import { Effect, Layer, pipe, Stdio } from "effect"
import {
  GraphicalReportHandler,
  JsonReportHandler,
  layer,
  NarratableReportHandler,
  ReportHandler,
} from "~/miette"
import { TerminalColors } from "~/uwu.js"
import { describe, test } from "~test/fixtures"

describe("autoReportHandler", () => {
  test("chooses json when output flag requests it", ({ expect, effect }) =>
    effect(
      Effect.gen(function* () {
        const handler = yield* ReportHandler
        expect(handler).toBeInstanceOf(JsonReportHandler)
      }).pipe(
        Effect.provide(
          pipe(
            layer,
            Layer.provideMerge(
              Layer.merge(
                TerminalColors.layerTest({ isTTY: false, useColors: true }),
                Stdio.layerTest({ args: Effect.succeed(["--output", "json"]) }),
              ),
            ),
          ),
        ),
      ),
    ))

  test("chooses graphical when pretty and tty", ({ expect, effect }) =>
    effect(
      Effect.gen(function* () {
        const handler = yield* ReportHandler

        expect(handler).toBeInstanceOf(GraphicalReportHandler)
      }).pipe(
        Effect.provide(
          pipe(
            layer,
            Layer.provideMerge(
              Layer.merge(
                TerminalColors.layerTest({ isTTY: true, useColors: true }),
                Stdio.layerTest({
                  args: Effect.succeed(["--output=pretty"]),
                }),
              ),
            ),
          ),
        ),
      ),
    ))

  test("falls back to narratable when not tty", ({ expect, effect }) =>
    effect(
      Effect.gen(function* () {
        const handler = yield* ReportHandler
        expect(handler).toBeInstanceOf(NarratableReportHandler)
      }).pipe(
        Effect.provide(
          pipe(
            layer,
            Layer.provideMerge(
              Layer.merge(
                TerminalColors.layerTest({ isTTY: false, useColors: true }),
                Stdio.layerTest({}),
              ),
            ),
          ),
        ),
      ),
    ))
})
