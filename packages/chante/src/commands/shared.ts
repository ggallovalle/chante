import { Flag } from "effect/unstable/cli"

export const configFlag = Flag.file("config", { mustExist: true }).pipe(
  Flag.withAlias("c"),
  Flag.optional,
)

export const dryRunFlag = Flag.boolean("dry-run").pipe(
  Flag.withDescription("Do not apply the operations"),
)
