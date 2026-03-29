import { Effect } from "effect"
import { Command, GlobalFlag } from "effect/unstable/cli"
import { ChanteConfig, parseFromCli } from "~/config.js"
import { GlobalOutputFlag, Output } from "~/output.js"
import { configFlag, dryRunFlag } from "./shared.js"

export const down = Command.make(
  "down",
  { config: configFlag, dryRun: dryRunFlag },
  Effect.fn("down")(function* (cli) {
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
  }),
).pipe(
  Command.withDescription(
    "Undo the configuration, removing links and files created by chante",
  ),
)
