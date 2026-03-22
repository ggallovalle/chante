import { Console, Effect, Config, FileSystem, Path, SchemaIssue } from "effect"
import { Command } from "effect/unstable/cli"
import { NodeServices, NodeRuntime } from "@effect/platform-node"

import { parseFromFile, ChanteConfig } from "./config.js"

const standardSchemaFormatter = SchemaIssue.makeFormatterStandardSchemaV1()
const HOME = Config.string("HOME")
const XDG_CONFIG_HOME = Config.string("XDG_CONFIG_HOME")
const DOTFILES = Config.string("DOTFILES")

const root = Command.make("chante").pipe(
  Command.withDescription("A dotfiles manager")
)


const doctor = Command.make("doctor", {}, Effect.fn("doctor")(function*() {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const home = yield* HOME
  const xdg_config_home = yield* XDG_CONFIG_HOME
  const dotfiles = yield* DOTFILES
  const dotfiles_config = path.join(dotfiles, "chante.config.kdl")
  const config = yield* parseFromFile(dotfiles_config)
  yield* Console.log("doctor")
  yield* Console.info("environment")
  yield* Console.table([
    { key: "HOME", value: home },
    { key: "XDG_CONFIG_HOME", value: xdg_config_home },
    { key: "DOTFILES", value: dotfiles },
  ])

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
    return Console.error(standardSchemaFormatter(schemaError.issue))
    // return Console.dir(schemaError.issue, { depth: null})
  })
)

program.pipe(
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain
)
