import { KdlSchema, kdl } from "@kbroom/effext/kdl"
import { Effect, Schema } from "effect"

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

const parse = KdlSchema.diagnosticString(Package)

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
  const fullResult = yield* Effect.match(parse(fullPackage), {
    onSuccess: (v) => v,
    onFailure: (e) => e,
  })
  console.dir(fullResult, { depth: null })

  const minimalPackage = kdl`
package "mylib" "1.0.0"
`

  console.log("\n=== Minimal package ===")
  const minimalResult = yield* Effect.match(parse(minimalPackage), {
    onSuccess: (v) => v,
    onFailure: (e) => e,
  })
  console.dir(minimalResult, { depth: null })

  const withScripts = kdl`
package "mylib" "1.0.0" {
    script "build" "tsc"
    script "test" "vitest"
}
`

  console.log("\n=== Package with scripts only ===")
  const scriptsResult = yield* Effect.match(parse(withScripts), {
    onSuccess: (v) => v,
    onFailure: (e) => e,
  })
  console.dir(scriptsResult, { depth: null })

  const withDeps = kdl`
package "mylib" "1.0.0" {
    dep "effect" "^2.0.0"
    dev-dep "vitest" "^1.0.0"
}
`

  console.log("\n=== Package with deps only ===")
  const depsResult = yield* Effect.match(parse(withDeps), {
    onSuccess: (v) => v,
    onFailure: (e) => e,
  })
  console.dir(depsResult, { depth: null })
})

await Effect.runPromise(program)
