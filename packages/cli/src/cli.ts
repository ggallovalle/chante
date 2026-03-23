import { Console, Effect } from "effect"
import { Command, Flag, GlobalFlag } from "effect/unstable/cli"
import { NodeServices, NodeRuntime } from "@effect/platform-node"

import * as env from "./env.js"
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
  const config = yield* parseFromCli(cli.config)

  yield* Console.log("doctor")
  yield* Console.info("environment")
  yield* Console.dir({
    "HOME": home,
    "CONFIG": config.path,
  }, { depth: null })

  yield* Console.info("config file")
  const configJson = yield* ChanteConfig.encodeUnknownAsJson(config.data)
  yield* Console.dir(configJson, { depth: null })
})).pipe(
  Command.withDescription("Test if everything is set up correctly")
)

const up = Command.make("up", { config: configFlag, dryRun: dryRunFlag }, Effect.fn("up")(function*(cli) {
  yield* Console.log("up")
  const logLevel = yield* GlobalFlag.LogLevel
  yield* Console.dir({
    "dry-run": cli.dryRun,
    "log-level": logLevel
  }, { depth: null })

  const config = yield* parseFromCli(cli.config)
  yield* Console.info("config file")
  const configJson = yield* ChanteConfig.encodeUnknownAsJson(config.data)
  yield* Console.dir(configJson, { depth: null })
})).pipe(
  Command.withDescription("Apply the configuration, linking, copying and templating dotfiles")
)

const down = Command.make("down", { config: configFlag, dryRun: dryRunFlag }, Effect.fn("down")(function*(cli) {
  yield* Console.log("down")
  const logLevel = yield* GlobalFlag.LogLevel
  yield* Console.dir({
    "dry-run": cli.dryRun,
    "log-level": logLevel
  }, { depth: null })

  yield* Effect.logTrace("effect log trace")
  yield* Effect.logDebug("effect log debug")
  yield* Effect.logInfo("effect log info")
  yield* Effect.logWarning("effect log warning")
  yield* Effect.logError("effect log error")
  yield* Effect.logFatal("effect log fatal")

  const config = yield* parseFromCli(cli.config)
  yield* Console.info("config file")
  const configJson = yield* ChanteConfig.encodeUnknownAsJson(config.data)
  yield* Console.dir(configJson, { depth: null })
}))
  .pipe(
    Command.withDescription("Undo the configuration, removing links and files created by chante")
  )

const program = root.pipe(
  Command.withSubcommands([doctor, up, down]),
  Command.run({
    version: "0.0.1"
  }),
  Effect.catchTag("SchemaError", (schemaError) => {
    return renderSchemaError(schemaError)
  }),
  Effect.catchTag("ConfigError", Effect.fnUntraced(function*(configError) {
    const ERR = "[X]"
    const HINT = "[?]"
    const cause = configError.cause
    if (cause && cause._tag === "SchemaError") {
      yield* Console.error(`${ERR} ensure env vars conform to schema`)
      yield* renderSchemaError(cause)
      return
    }
    const msg = cause?.message ?? configError.message
    yield* Console.error(`${ERR} ${msg}`)
    yield* Console.info(`${HINT} ensure required env vars are set`)
  })),
  // CLI errors
  Effect.catchTag("InvalidValue", (invalidValue) => {
    return Console.error(invalidValue.message)
  }),
  Effect.catchTag("UserError", (userError) => {
    const ERR = "[X]"
    return Console.error(`${ERR} ${userError.cause}`)
  })
)


program.pipe(
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain
)

