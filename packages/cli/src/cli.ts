import { Console, Effect, Config, FileSystem, Path, Option } from "effect"
import { Command, Flag } from "effect/unstable/cli"
import { NodeServices, NodeRuntime } from "@effect/platform-node"

import { parseFromFile, ChanteConfig } from "./config.js"
import { renderSchemaError } from "./config-issue.js"

const HOME = Config.string("HOME")
const XDG_CONFIG_HOME = Config.string("XDG_CONFIG_HOME")
const DOTFILES = Config.string("DOTFILES")

const root = Command.make("chante").pipe(
  Command.withDescription("A dotfiles manager")
)

const configFlag = Flag.file("config", { mustExist: true }).pipe(
  Flag.withAlias("c"),
  Flag.optional,
)

const doctor = Command.make("doctor", { config: configFlag }, Effect.fn("doctor")(function*(cli) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const home = yield* HOME
  const xdg_config_home = yield* XDG_CONFIG_HOME
  const dotfiles = yield* DOTFILES
  const defaultConfig = path.join(dotfiles, "chante.config.kdl")

  if (Option.isNone(cli.config) && !(yield* fs.exists(defaultConfig))) {
    return yield* Console.error(`Config file not found: ${defaultConfig}`)
  }

  const configPath = Option.getOrElse(cli.config, () => defaultConfig)
  const config = yield* parseFromFile(configPath)
  yield* Console.log("doctor")
  yield* Console.info("environment")
  yield* Console.dir({
    "HOME": home,
    "XDG_CONFIG_HOME": xdg_config_home,
    "DOTFILES": dotfiles,
    "CONFIG": configPath,
  }, { depth: null })

  yield* Console.info("config file")
  const configJson = yield* ChanteConfig.encodeUnknownAsJson(config)
  yield* Console.dir(configJson, { depth: null })
})).pipe(
  Command.withDescription("Test if everything is set up correctly")
)

const up = Command.make("up", {}, Effect.fn("up")(function*() {
  yield* Console.log("up")
})).pipe(
  Command.withDescription("Apply the configuration, linking, copying and templating dotfiles")
)

const down = Command.make("down", {}, Effect.fn("down")(function*() {
  yield* Console.log("down")
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
  })
)

program.pipe(
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain
)
