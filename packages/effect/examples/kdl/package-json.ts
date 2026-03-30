import { KdlSchema, kdl } from "@kbroom/effect/kdl"
import { Effect, Schema, SchemaIssue } from "effect"

const standardSchemaFormatter = SchemaIssue.makeFormatterStandardSchemaV1()

const Script = KdlSchema.Node("script", {
  name: KdlSchema.Arg(0, KdlSchema.V(Schema.String)),
  command: KdlSchema.Arg(1, KdlSchema.V(Schema.String)),
})

const Dep = KdlSchema.Node("dep", {
  name: KdlSchema.Arg(0, KdlSchema.V(Schema.String)),
  version: KdlSchema.Arg(1, KdlSchema.V(Schema.String)),
})

const DevDep = KdlSchema.Node("dev-dep", {
  name: KdlSchema.Arg(0, KdlSchema.V(Schema.String)),
  version: KdlSchema.Arg(1, KdlSchema.V(Schema.String)),
})

const Package = KdlSchema.Node("package", {
  name: KdlSchema.Arg(0, KdlSchema.V(Schema.String)),
  version: KdlSchema.Arg(1, KdlSchema.V(Schema.String)),
  description: KdlSchema.optional(
    KdlSchema.Opt("description", KdlSchema.V(Schema.String)),
  ),
  main: KdlSchema.optional(KdlSchema.Opt("main", KdlSchema.V(Schema.String))),
  type: KdlSchema.optional(KdlSchema.Opt("type", KdlSchema.V(Schema.String))),
  scripts: KdlSchema.Many(Script),
  deps: KdlSchema.Many(Dep),
  devDeps: KdlSchema.Many(DevDep),
})

const decoder = KdlSchema.decodeSourceResult(Package)

const program = Effect.gen(function* () {
  const fullPackage = kdl`
package "mylib" "1.0.0" {
    description "A cool library"
    main "dist/index.js"
    type "module"
    script "build" "tsc"
    script "test" "vitest"
    dep "effect" "^2.0.0"
    dev-dep "vitest" "^1.0.0"
}
`

  console.log("=== Full package ===")
  const fullResult = yield* Effect.fromResult(decoder(fullPackage)).pipe(
    Effect.mapError(standardSchemaFormatter),
  )
  console.dir(fullResult, { depth: null })

  const minimalPackage = kdl`
package "mylib" "1.0.0"
`

  console.log("\n=== Minimal package ===")
  const minimalResult = yield* Effect.fromResult(decoder(minimalPackage)).pipe(
    Effect.mapError(standardSchemaFormatter),
  )
  console.dir(minimalResult, { depth: null })

  const withScripts = kdl`
package "mylib" "1.0.0" {
    script "build" "tsc"
    script "test" "vitest"
}
`

  console.log("\n=== Package with scripts only ===")
  const scriptsResult = yield* Effect.fromResult(decoder(withScripts)).pipe(
    Effect.mapError(standardSchemaFormatter),
  )
  console.dir(scriptsResult, { depth: null })

  const withDeps = kdl`
package "mylib" "1.0.0" {
    dep "effect" "^2.0.0"
    dev-dep "vitest" "^1.0.0"
}
`

  console.log("\n=== Package with deps only ===")
  const depsResult = yield* Effect.fromResult(decoder(withDeps)).pipe(
    Effect.mapError(standardSchemaFormatter),
  )
  console.dir(depsResult, { depth: null })
})

await Effect.runPromise(program)
