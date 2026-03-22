import { parse, getLocation } from "@bgotink/kdl"
import { Effect, Schema, SchemaIssue, Predicate, FileSystem, Path } from "effect"

export type ParseFromOptions = {
  fileName: string;
  content: string;
  path: string;
}

export class ChantePackage extends Schema.Opaque<ChantePackage>()(

  Schema.Struct({
    name: Schema.String,
    root: Schema.optional(Schema.String)
  })
) {
}

export class ChanteBundle extends Schema.Opaque<ChanteBundle>()(

  Schema.Struct({
    name: Schema.String,
    requires: Schema.Array(Schema.String)
  })
) {
}

export class ChanteConfig extends Schema.Opaque<ChanteConfig>()(
  Schema.Struct({
    packages: Schema.Array(ChantePackage),
    bundles: Schema.Array(ChanteBundle)
  })
) {
  static decodeUnknown = Schema.decodeUnknownEffect(ChanteConfig)
  static encodeUnknownAsJson = Schema.encodeUnknownEffect(Schema.toCodecJson(ChanteConfig))
}

export const parseFromFile = Effect.fn("parseFromFile")(function*(path: string) {
  const fs = yield* FileSystem.FileSystem
  const pathModule = yield* Path.Path
  const content = yield* fs.readFileString(path)
  const fileName = pathModule.basename(path)
  return yield* parseFrom({
    content,
    fileName,
    path
  })
})

export const parseFrom = Effect.fn("parseFrom")(function*(opts: ParseFromOptions) {
  const doc = parse(opts.content, { storeLocations: true })
  const docLocation = getLocation(doc)
  const packages = doc.findNodeByName("packages")
  if (Predicate.isUndefined(packages)) {
    return yield* Effect.fail(new Schema.SchemaError(new SchemaIssue.MissingKey({ messageMissingKey: "'packages' is required", kdlLocation: docLocation })))
  }

  const configPkgs = []
  for (const pkg of packages.findNodesByName("package")) {
    const name = pkg.getArgument(0)
    configPkgs.push({
      name: name?.valueOf()
    })
  }

  const bundles = doc.findNodeByName("bundles")
  if (Predicate.isUndefined(bundles)) {
    return yield* Effect.fail(new Schema.SchemaError(new SchemaIssue.MissingKey({ messageMissingKey: "'bundles' is required", kdlLocation: docLocation })))
  }

  const configBundles = []
  for (const bundle of bundles.findNodesByName("bundle")) {
    const name = bundle.getArgument(0)
    const configRequires = []

    for (const dep of bundle.findNodesByName("require")) {
      const name = dep.getArgument(0)
      configRequires.push(name?.valueOf())
    }
    configBundles.push({
      name: name?.valueOf(),
      requires: configRequires
    })
  }


  return yield* ChanteConfig.decodeUnknown({ packages: configPkgs, bundles: configBundles })
})

