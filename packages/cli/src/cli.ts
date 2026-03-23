import { Effect, Layer, Logger } from "effect"
import { Command, Flag, GlobalFlag } from "effect/unstable/cli"
import { NodeServices, NodeRuntime } from "@effect/platform-node"

import * as env from "./env.js"
import { GlobalOutputFlag, Output, OutputLayer } from "./output.js"
import { parseFromCli, ChanteConfig } from "./config.js"
import { renderSchemaError } from "./config-issue.js"

const configFlag = Flag.file("config", { mustExist: true }).pipe(
  Flag.withAlias("c"),
  Flag.optional,
)

const dryRunFlag = Flag.boolean("dry-run").pipe(
  Flag.withDescription("Do not apply the operations")
)

const root = Command.make("chante").pipe(
  Command.withDescription("A dotfiles manager"),
)

const doctor = Command.make("doctor", { config: configFlag }, Effect.fn("doctor")(function*(cli) {
  const home = yield* env.HOME
  const output = yield* Output
  const config = yield* parseFromCli(cli.config)

  yield* output.logMsg("environment")
  yield* output.logKeyValue("HOME", home)
  yield* output.logKeyValue("CONFIG", config.path)

  yield* output.logMsg("config file")
  yield* output.logSchema(ChanteConfig, config.data)
})).pipe(
  Command.withDescription("Test if everything is set up correctly")
)

const up = Command.make("up", { config: configFlag, dryRun: dryRunFlag }, Effect.fn("up")(function*(_cli) {
  const output = yield* Output
  yield* output.logMsg("up")
})).pipe(
  Command.withDescription("Apply the configuration, linking, copying and templating dotfiles")
)

const down = Command.make("down", { config: configFlag, dryRun: dryRunFlag }, Effect.fn("down")(function*(cli) {
  const output = yield* Output
  const logLevel = yield* GlobalFlag.LogLevel
  const outputStyle = yield* GlobalOutputFlag

  yield* output.logMsg("cli")
  yield* output.logKeyValue("dry-run", cli.dryRun)
  yield* output.logKeyValue("log-level", logLevel)
  yield* output.logKeyValue("output", outputStyle)

  yield* Effect.logTrace("effect log trace")
  yield* Effect.logDebug("effect log debug")
  yield* Effect.logInfo("effect log info")
  yield* Effect.logWarning("effect log warning")
  yield* Effect.logError("effect log error")
  yield* Effect.logFatal("effect log fatal")

  const config = yield* parseFromCli(cli.config)
  yield* output.logMsg("config file")
  yield* output.logSchema(ChanteConfig, config.data)

}))
  .pipe(
    Command.withDescription("Undo the configuration, removing links and files created by chante")
  )

const program = root.pipe(
  Command.withSubcommands([doctor, up, down]),
  Command.withGlobalFlags([GlobalOutputFlag]),
  Command.run({
    version: "0.0.1"
  }),
  Effect.catchTag("SchemaError", (schemaError) => {
    return renderSchemaError(schemaError)
  }),
  Effect.catchTag("ConfigError", Effect.fnUntraced(function*(configError) {
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
  })),
  // CLI errors
  Effect.catchTag("InvalidValue", Effect.fnUntraced(function*(invalidValue) {
    const output = yield* Output
    yield* output.errorMsg(invalidValue.message)
  })),
  Effect.catchTag("UserError", Effect.fnUntraced(function*(userError) {
    const output = yield* Output
    yield* output.errorUnknown(userError.cause)
  }))
)

const Layers = Layer.mergeAll(
  OutputLayer,
  Layer.succeed(Logger.LogToStderr)(true),
  NodeServices.layer)

program.pipe(
  Effect.provide(Layers),
  NodeRuntime.runMain
)

