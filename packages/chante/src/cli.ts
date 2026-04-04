import { BunRuntime, BunServices } from "@effect/platform-bun"
import { Effect, Layer, Logger } from "effect"
import { Command } from "effect/unstable/cli"
import { doctor, down, root, up } from "~/commands.js"
import { renderSchemaError } from "~/config/issue.js"
import { GlobalOutputFlag, Output, OutputLayer } from "~/output.js"

const program = root.pipe(
  Command.withSubcommands([doctor, up, down]),
  Command.withGlobalFlags([GlobalOutputFlag]),
  Command.run({
    version: "0.0.1",
  }),
  Effect.catchTag("SchemaError", (schemaError) => {
    return renderSchemaError(schemaError)
  }),
  Effect.catchTag(
    "ConfigError",
    Effect.fnUntraced(function* (configError) {
      const output = yield* Output
      const cause = configError.cause
      if (cause && cause._tag === "SchemaError") {
        yield* output.errorMsg("ensure env vars conform to schema")
        yield* renderSchemaError(cause)
        return
      }
      const msg = cause?.message ?? configError.message
      yield* output.errorMsg(msg)
      yield* output.hintMsg("ensure required env vars are set")
    }),
  ),
  Effect.catchTag(
    "InvalidValue",
    Effect.fnUntraced(function* (invalidValue) {
      const output = yield* Output
      yield* output.errorMsg(invalidValue.message)
    }),
  ),
  Effect.catchTag(
    "UserError",
    Effect.fnUntraced(function* (userError) {
      const output = yield* Output
      yield* output.errorUnknown(userError.cause)
    }),
  ),
)

const Layers = Layer.mergeAll(
  OutputLayer,
  Layer.succeed(Logger.LogToStderr)(true),
  BunServices.layer,
)

const main = program.pipe(Effect.provide(Layers))

BunRuntime.runMain(main as Effect.Effect<void, unknown, never>)
