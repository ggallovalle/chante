import { Console, Effect } from "effect"
import { Command } from "effect/unstable/cli"
import { NodeServices, NodeRuntime } from "@effect/platform-node"

const root = Command.make("chante").pipe(
  Command.withDescription("A dotfiles manager")
)

const doctor = Command.make("doctor", {}, Effect.fn("doctor")(function*() {
  yield* Console.log("doctor")
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
  })
)

program.pipe(
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain
)
