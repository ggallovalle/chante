import { parse, getLocation, type StoredLocation, type Primitive, type Document, type Node } from "@bgotink/kdl"
import { Effect, Schema, Predicate, FileSystem, Path } from "effect"
import { invalid, type ParseContext, type KdlIssue, type DuplicateNameIssue } from "./config-issue.js"

const getLocationStrict = (element: Parameters<typeof getLocation>[0]): StoredLocation => {
  const location = getLocation(element)
  // if (!location) {
  //   throw new Error("KDL location is required; ensure parser runs with storeLocations: true")
  // }
  return location as unknown as any
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
    path,
    fileName
  })
})

export const parseFrom = Effect.fn("parseFrom")(function*(opts: ParseContext) {
  const doc = parse(opts.content, { storeLocations: true })
  const kdlIssues: KdlIssue[] = []
  const failWith: FailWith = (...issues) => invalid(issues, opts)

  const packages = yield* childRequired(doc, "packages", failWith)

  const configPkgs = []
  const packageNames = new Map<string, StoredLocation>()
  for (const pkg of packages.findNodesByName("package")) {
    const name = yield* argumentString(pkg, 0, failWith)
    const pkgLoc = getLocationStrict(pkg)
    const existing = packageNames.get(name)
    if (existing) {
      const dup: DuplicateNameIssue = {
        _type: "DuplicateName",
        entity: "package",
        name,
        first: existing,
        duplicate: pkgLoc
      }
      kdlIssues.push(dup)
    } else {
      packageNames.set(name, pkgLoc)
    }
    configPkgs.push({
      name
    })
  }


  const bundles = yield* childRequired(doc, "bundles", failWith)

  const configBundles = []
  const bundleNames = new Map<string, StoredLocation>()
  for (const bundle of bundles.findNodesByName("bundle")) {
    const bundleName = yield* argumentString(bundle, 0, failWith)
    const bundleLoc = getLocationStrict(bundle)
    const existing = bundleNames.get(bundleName)
    if (existing) {
      const dup: DuplicateNameIssue = {
        _type: "DuplicateName",
        entity: "bundle",
        name: bundleName,
        first: existing,
        duplicate: bundleLoc
      }
      kdlIssues.push(dup)
    } else {
      bundleNames.set(bundleName, bundleLoc)
    }
    const configRequires = []

    for (const dep of bundle.findNodesByName("require")) {
      const depName = yield* argumentString(dep, 0, failWith)
      if (!packageNames.has(depName)) {
        const location = getLocationStrict(dep)
        kdlIssues.push({
          _type: "MissingRequire",
          bundle: bundleName,
          require: depName,
          location
        })
      }
      configRequires.push(depName)
    }
    configBundles.push({
      name: bundleName,
      requires: configRequires
    })
  }

  if (kdlIssues.length > 0) {
    return yield* invalid(kdlIssues, opts)
  }

  return yield* ChanteConfig.decodeUnknown({ packages: configPkgs, bundles: configBundles })
})

type FailWith = (...issues: KdlIssue[]) => Effect.Effect<never, Schema.SchemaError, never>

export function argumentString(root: Node, index: number, failWith: FailWith): Effect.Effect<string, Schema.SchemaError, never> {
  const entry = root.getArgumentEntry(index)
  if (Predicate.isUndefined(entry)) {
    const location = getLocationStrict(root)
    return failWith({ _type: "RequiredArgumentIssue", index, node: root, location })
  }
  const value = entry.getValue()
  if (Predicate.isString(value)) {
    return Effect.succeed(value)
  }

  const location = getLocationStrict(entry)
  return failWith({ _type: "RequiredArgumentIssue", index, node: root, location })
}

export function childRequired(root: Document | Node, name: string, failWith: FailWith): Effect.Effect<Node, Schema.SchemaError, never> {

  const node = root.findNodeByName(name)

  if (Predicate.isUndefined(node)) {
    const location = getLocationStrict(root)
    return failWith({ _type: "RequiredChild", location, child: name })
  }

  return Effect.succeed(node)
}
