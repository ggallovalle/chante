import { Effect } from "effect"
import { Command } from "effect/unstable/cli"
import { ChanteConfig, parseFromCli } from "~/config.js"
import * as env from "~/env.js"
import { Output } from "~/output.js"
import { configFlag } from "./shared.js"

export const doctor = Command.make(
  "doctor",
  { config: configFlag },
  Effect.fn("doctor")(function* (cli) {
    const home = yield* env.HOME
    const output = yield* Output
    const config = yield* parseFromCli(cli.config)

    yield* output.logMsg("environment")
    yield* output.logKeyValue("HOME", home)
    yield* output.logKeyValue("CONFIG", config.path)

    yield* output.logMsg("config file")
    yield* output.logSchema(ChanteConfig, config.data)
  }),
).pipe(Command.withDescription("Test if everything is set up correctly"))
