import { parse, getLocation, type StoredLocation, type Primitive } from "@bgotink/kdl"
import { Effect, Schema, SchemaIssue, Predicate, FileSystem, Path, Option } from "effect"
import type { MissingRequirePayload } from "./errors.js"

export type ParseFromOptions = {
  fileName: string;
  content: string;
  path: string;
}

const getLocationStrict = (element: Parameters<typeof getLocation>[0]): StoredLocation => {
  const location = getLocation(element)
  // if (!location) {
  //   throw new Error("KDL location is required; ensure parser runs with storeLocations: true")
  // }
  return location as unknown as any
}

const getStringStrict = (element: Primitive | undefined): string => {
  const value = element?.valueOf()
  return value as unknown as string
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
  const docLocation = getLocationStrict(doc)
  const packages = doc.findNodeByName("packages")
  if (Predicate.isUndefined(packages)) {
    return yield* Effect.fail(new Schema.SchemaError(new SchemaIssue.MissingKey({ messageMissingKey: "'packages' is required", kdlLocation: docLocation })))
  }

  const configPkgs = []
  const packageNames = new Set<string>()
  for (const pkg of packages.findNodesByName("package")) {
    const name = pkg.getArgument(0)
    const value = name?.valueOf()
    if (Predicate.isString(value)) {
      packageNames.add(value)
    }
    configPkgs.push({
      name: value
    })
  }

  const bundles = doc.findNodeByName("bundles")
  if (Predicate.isUndefined(bundles)) {
    return yield* Effect.fail(new Schema.SchemaError(new SchemaIssue.MissingKey({ messageMissingKey: "'bundles' is required", kdlLocation: docLocation })))
  }

  const configBundles = []
  const missingRequires: Array<MissingRequirePayload> = []
  for (const bundle of bundles.findNodesByName("bundle")) {
    const bundleName = bundle.getArgument(0)
    const configRequires = []

    for (const dep of bundle.findNodesByName("require")) {
      const depName = dep.getArgument(0)
      const requireName = depName?.valueOf()
      if (Predicate.isString(requireName)) {
        if (!packageNames.has(requireName)) {
          const location = getLocationStrict(dep)
          missingRequires.push({
            _type: "MissingRequire",
            bundle: getStringStrict(bundleName),
            require: requireName,
            location
          })
        }
      }
      configRequires.push(requireName)
    }
    configBundles.push({
      name: bundleName?.valueOf(),
      requires: configRequires
    })
  }

  if (missingRequires.length > 0) {
    return yield* Effect.fail(
      new Schema.SchemaError(
        new SchemaIssue.InvalidValue(Option.some(missingRequires), {
          kdlIssues: missingRequires,
          parseFromOptions: opts
        })
      )
    )
  }

  return yield* ChanteConfig.decodeUnknown({ packages: configPkgs, bundles: configBundles })
})
