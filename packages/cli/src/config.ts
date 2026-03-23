import { Effect, Schema, Predicate, FileSystem, Path, type Config, Option } from "effect"
import { parse, getLocation, type StoredLocation, type Document, type Node } from "@bgotink/kdl"
import { invalid, type ParseContext, type KdlIssue, type DuplicateNameIssue } from "./config-issue.js"
import * as env from "./env.js"
import { CliError } from "effect/unstable/cli"

const getLocationStrict = (element: Parameters<typeof getLocation>[0]): StoredLocation => {
  const location = getLocation(element)
  // if (!location) {
  //   throw new Error("KDL location is required; ensure parser runs with storeLocations: true")
  // }
  return location as unknown as any
}

export class StoredLocationSchema extends Schema.Opaque<StoredLocationSchema>()(

  Schema.Struct({
    start: Schema.Struct({ line: Schema.Number, column: Schema.Number }),
    end: Schema.Struct({ line: Schema.Number, column: Schema.Number })
  })
) {
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
    requires: Schema.Array(Schema.String),
    files: Schema.Array(Schema.Struct({
      relativeTo: Schema.Literals(["home", "config"]),
      op: Schema.Literals(["cp", "ln", "template"]),
      source: Schema.String,
      target: Schema.String,
      location: StoredLocationSchema
    }))
  })
) {
}

export class ChanteSettings extends Schema.Opaque<ChanteSettings>()(
  Schema.Struct({
    user: Schema.String,
    paths: Schema.Struct({
      home: Schema.String,
      config: Schema.String,
      cache: Schema.String,
      data: Schema.String,
      bin: Schema.String,
      dotfiles: Schema.String,
    })
  })
) {
}

export class ChanteConfig extends Schema.Opaque<ChanteConfig>()(
  Schema.Struct({
    settings: ChanteSettings,
    packages: Schema.Array(ChantePackage),
    bundles: Schema.Array(ChanteBundle)
  })
) {
  static decodeUnknown = Schema.decodeUnknownEffect(ChanteConfig)
  static encodeUnknownAsJson = Schema.encodeUnknownEffect(Schema.toCodecJson(ChanteConfig))
}

export const parseFromCli = Effect.fnUntraced(function*(flag: Option.Option<string>) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  let configPath = ""
  const source: "cli" | "env" = Option.isSome(flag) ? "cli" : "env"

  if (Option.isNone(flag)) {
    const dotfiles = yield* env.DOTFILES
    const defaultConfig = path.join(dotfiles, "chante.config.kdl")
    if (!(yield* fs.exists(defaultConfig))) {
      return yield* new CliError.UserError({ cause: `Inferred config file not found: ${defaultConfig}` })
    }
    configPath = defaultConfig
  } else {
    configPath = flag.value
  }

  const config = yield* parseFromFile(configPath)

  return {
    path: configPath,
    data: config,
    source
  }
})

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

const getSettings = Effect.fn("getSettings")(function*(root: Document, failWith: FailWith) {
  const pathM = yield* Path.Path
  const fs = yield* FileSystem.FileSystem
  const rootLocation = getLocationStrict(root)

  const settingsNode = root.findNodeByName("settings")
  const settingsLocation = Predicate.isUndefined(settingsNode) ? rootLocation : getLocationStrict(settingsNode)
  const pathsNode = settingsNode?.findNodeByName("paths")

  const resolve = (label: string, node: Node | undefined, fallback: Effect.Effect<string, Schema.SchemaError | Config.ConfigError, never>) =>
    Effect.gen(function*() {
      const value = !Predicate.isUndefined(node) ? yield* argumentString(node, 0, failWith) : yield* fallback
      const location = !Predicate.isUndefined(node) ? getLocationStrict(node) : settingsLocation
      return { label, value, location }
    })

  const userNode = settingsNode?.findNodeByName("user")
  const homeNode = pathsNode?.findNodeByName("home")
  const configNode = pathsNode?.findNodeByName("config")
  const cacheNode = pathsNode?.findNodeByName("cache")
  const dataNode = pathsNode?.findNodeByName("data")
  const binNode = pathsNode?.findNodeByName("bin")
  const dotfilesNode = pathsNode?.findNodeByName("dotfiles")

  const user = yield* resolve("user", userNode, env.USER.asEffect())
  const home = yield* resolve("home", homeNode, env.HOME.asEffect())
  const config = yield* resolve(
    "config",
    configNode,
    Effect.orElseSucceed(env.XDG_CONFIG_HOME.asEffect(), () => pathM.join(home.value, ".config"))
  )
  const cache = yield* resolve(
    "cache",
    cacheNode,
    Effect.orElseSucceed(env.XDG_CACHE_HOME.asEffect(), () => pathM.join(home.value, ".cache"))
  )
  const data = yield* resolve(
    "data",
    dataNode,
    Effect.orElseSucceed(env.XDG_DATA_HOME.asEffect(), () => pathM.join(home.value, ".local", "share"))
  )
  const bin = yield* resolve(
    "bin",
    binNode,
    Effect.orElseSucceed(env.XDG_BIN_HOME.asEffect(), () => pathM.join(home.value, ".local", "bin"))
  )
  const dotfiles = yield* resolve(
    "dotfiles",
    dotfilesNode,
    Effect.orElseSucceed(env.DOTFILES.asEffect(), () => pathM.join(home.value, "dotfiles"))
  )

  const pathChecks = [home, config, cache, data, dotfiles].map((entry) =>
    Effect.map(fs.exists(entry.value), (ok) =>
      ok
        ? undefined
        : { _type: "MissingPath", label: entry.label, path: entry.value, location: entry.location } as KdlIssue
    )
  )

  const missingPaths = (yield* Effect.all(pathChecks, { concurrency: "unbounded" })).filter(
    (issue): issue is KdlIssue => issue !== undefined
  )

  if (missingPaths.length > 0) {
    return yield* failWith(...missingPaths)
  }

  return ChanteSettings.makeUnsafe({
    user: user.value,
    paths: {
      home: home.value,
      config: config.value,
      cache: cache.value,
      data: data.value,
      bin: bin.value,
      dotfiles: dotfiles.value
    }
  })
})

type FailWith = (...issues: KdlIssue[]) => Effect.Effect<never, Schema.SchemaError, never>
type BundleFile = {
  relativeTo: "home" | "config"
  op: "cp" | "ln" | "template"
  source: string
  target: string
  location: StoredLocation
}

const parseFileOps =
  Effect.fn("parseFileOps")(function*(
    block: Document | null | undefined,
    relativeTo: BundleFile["relativeTo"],
    files: Array<BundleFile>,
    failWith: FailWith
  ) {
    if (Predicate.isUndefined(block) || block === null) {
      return
    }
    const knownOps: Array<BundleFile["op"]> = ["cp", "ln", "template"]
    const children = block.nodes ?? []
    for (const child of children) {
      const op = child.getName()
      if (knownOps.includes(op as BundleFile["op"])) {
        const source = yield* argumentString(child, 0, failWith)
        const target = yield* argumentString(child, 1, failWith)
        files.push({
          relativeTo,
          op: op as BundleFile["op"],
          source,
          target,
          location: getLocationStrict(child)
        })
      } else {
        const location = getLocationStrict(child)
        return yield* failWith({ _type: "ExpectedOneOf", actual: op, expected: knownOps, location })
      }
    }
  })

export const parseFrom = Effect.fn("parseFrom")(function*(opts: ParseContext) {
  const doc = parse(opts.content, { storeLocations: true })
  const kdlIssues: KdlIssue[] = []
  const failWith: FailWith = (...issues) => invalid(issues, opts)


  const settings = yield* getSettings(doc, failWith)
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
    const files: Array<BundleFile> = []

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

    const configBlock = bundle.children?.findNodeByName("config")
    const homeBlock = bundle.children?.findNodeByName("home")
    yield* parseFileOps(configBlock?.children, "config", files, failWith)
    yield* parseFileOps(homeBlock?.children, "home", files, failWith)

    configBundles.push({
      name: bundleName,
      requires: configRequires,
      files
    })
  }

  if (kdlIssues.length > 0) {
    return yield* invalid(kdlIssues, opts)
  }

  return yield* ChanteConfig.decodeUnknown({ settings, packages: configPkgs, bundles: configBundles })
})

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
