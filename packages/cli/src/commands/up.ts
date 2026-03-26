import { Effect } from "effect"
import { Command } from "effect/unstable/cli"
import { Output } from "~/output.js"
import { configFlag, dryRunFlag } from "./shared.js"

export const up = Command.make(
  "up",
  { config: configFlag, dryRun: dryRunFlag },
  Effect.fn("up")(function* (_cli) {
    const output = yield* Output
    yield* output.logMsg("up")
  }),
).pipe(
  Command.withDescription(
    "Apply the configuration, linking, copying and templating dotfiles",
  ),
)
