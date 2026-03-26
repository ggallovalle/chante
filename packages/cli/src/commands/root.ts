import { Command } from "effect/unstable/cli"

export const root = Command.make("chante").pipe(
  Command.withDescription("A dotfiles manager"),
)
