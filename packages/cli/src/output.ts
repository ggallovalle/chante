import { Effect, ServiceMap, Layer, Console, Schema } from "effect"
import { GlobalFlag, Flag } from "effect/unstable/cli"

export const GlobalOutputFlag = GlobalFlag.setting("output")({
  flag: Flag.choiceWithValue("output", [
    ["pretty", "pretty" as const],
    // TODO
    // ["json", "json" as const],
    // ["jsonc", "jsonc" as const],
    // ["ndjson", "ndjson" as const],
    // ["md", "markdown" as const],
    // ["markdown", "markdown" as const],
  ]).pipe(
    Flag.withDefault("pretty"),
    Flag.withDescription("Manages the production of output from the result of a command invocation")
  )
})

export interface IOutput {
  logMsg(message: string): Effect.Effect<void>
  logKeyValue(key: string, value: any): Effect.Effect<void>
  logRecord(record: Record<string, any>): Effect.Effect<void>
  logSchema(schema: Schema.Top, value: unknown): Effect.Effect<void, Schema.SchemaError>
  errorMsg(message: string): Effect.Effect<void>
  errorKeyValue(key: string, value: any): Effect.Effect<void>
  errorUnknown(unknown: unknown): Effect.Effect<void>
  hintMsg(message: string): Effect.Effect<void>
}

export class Output extends ServiceMap.Service<Output, IOutput>()("@chante/cli/renderer") { }

export const OutputLayer = Layer.effect(Output, Effect.gen(function*() {
  const output = yield* Console.Console

  return {
    logMsg(message) {
      return Effect.sync(() => output.log(`> ${message}`))
    },
    logKeyValue(key, value) {
      return Effect.sync(() => output.log(`${key}: ${value}`))
    },
    logRecord(record) {
      return Effect.sync(() => {
        for (const [key, value] of Object.entries(record)) {
          output.log(`${key}: ${value}`)
        }
      })
    },
    logSchema(schema, value) {
      const codec = Schema.encodeUnknownEffect(Schema.toCodecJson(schema))
      const result = Effect.map(codec(value), (json) => output.dir(json, { depth: null }))
      // bypass the possible dependencies for encoding the schema
      return result as any
    },
    errorMsg(message) {
      return Effect.sync(() => output.error(`[X] ${message}`))
    },
    errorKeyValue(key, value) {
      return Effect.sync(() => output.error(`[X] ${key}: ${value}`))
    },
    errorUnknown(message) {
      return Effect.sync(() => output.error(`[X] ${message}`))
    },
    hintMsg(message) {
      return Effect.sync(() => output.log(`[?] ${message}`))
    },
  }
}))
