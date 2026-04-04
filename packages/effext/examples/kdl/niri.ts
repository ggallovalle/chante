import { KdlSchema, kdl } from "@kbroom/effext/kdl"
import { Effect, Schema, SchemaIssue } from "effect"

const standardSchemaFormatter = SchemaIssue.makeFormatterStandardSchemaV1()

// @see https://github.com/niri-wm/niri/blob/main/niri-config/src/workspace.rs
const Workspace = KdlSchema.Node("workspace", {
  name: KdlSchema.Arg(0, KdlSchema.V(Schema.String)),
  openOnOutput: KdlSchema.Opt(
    "open-on-output",
    KdlSchema.V(Schema.String),
  ).pipe(KdlSchema.optional),
})

// @see https://github.com/niri-wm/niri/blob/main/niri-config/src/lib.rs
const Config = KdlSchema.Document({
  worspaces: KdlSchema.Many(Workspace),
})

const decoder = KdlSchema.decodeSourceResult(Config)

const program = Effect.gen(function* () {
  const namedWorkspaces = kdl`
workspace "browser"

workspace "chat" {
    open-on-output "Some Company CoolMonitor 1234"
}
`

  const namedWorkspacesTree = yield* Effect.fromResult(
    decoder(namedWorkspaces),
  ).pipe(Effect.mapError(standardSchemaFormatter))

  console.dir(namedWorkspacesTree, { depth: null })
})

await Effect.runPromise(program)
