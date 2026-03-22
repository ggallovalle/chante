import { Console, Effect, Schema, SchemaIssue, Option } from "effect"
import type { StoredLocation } from "@bgotink/kdl"

export type MissingRequirePayload = {
  _type: "MissingRequire"
  bundle: string | undefined
  require: string
  location: StoredLocation
}

export type MissingPackagesPayload = {
  _type: "MissingPackagesNode"
  location: StoredLocation
}

export type MissingBundlesPayload = {
  _type: "MissingBundlesNode"
  location: StoredLocation
}

export type KdlValueIssue =
  | MissingRequirePayload
  | MissingPackagesPayload
  | MissingBundlesPayload

export type ParseContext = {
  path: string
  content: string
  fileName: string
}

const standardSchemaFormatter = SchemaIssue.makeFormatterStandardSchemaV1()

type RendererMap = {
  [K in KdlValueIssue["_type"]]: (
    payload: Extract<KdlValueIssue, { _type: K }>,
    shared: ParseContext
  ) => Effect.Effect<void>
}

const rendererMap: RendererMap = {
  MissingPackagesNode: (_payload, shared) => Effect.gen(function*() {
    const header = "config missing required 'packages' block"
    const location = _payload.location
    yield* renderSimpleSnippet(shared, location, header)
  }),
  MissingBundlesNode: (_payload, shared) => Effect.gen(function*() {
    const header = "config missing required 'bundles' block"
    const location = _payload.location
    yield* renderSimpleSnippet(shared, location, header)
  }),
  MissingRequire: (payload, shared) => Effect.gen(function*() {
    const headerBundle = payload.bundle ?? "<unknown bundle>"
    const header = `bundle \"${headerBundle}\" requires unknown package \"${payload.require}\"`
    const location = payload.location
    yield* renderSimpleSnippet(shared, location, header)
  })
}

const renderSimpleSnippet = (shared: ParseContext, location: StoredLocation, header: string) =>
  Effect.gen(function*() {
    const lines = shared.content.split(/\r?\n/)
    const startLine = location.start.line
    const endLine = location.end.line
    const startColumn = location.start.column
    const endColumn = location.end.column

    const contextStart = Math.max(1, startLine - 2)
    const contextEnd = Math.min(lines.length, endLine + 2)
    const lineNoWidth = String(contextEnd).length

    yield* Console.info(header)
    yield* Console.info(`--> ${shared.path}:${startLine}:${startColumn}`)
    yield* Console.error(" |")

    for (let lineNo = contextStart; lineNo <= contextEnd; lineNo++) {
      const lineText = lines[lineNo - 1] ?? ""
      const gutter = String(lineNo).padStart(lineNoWidth, " ")
      const isIssueLine = lineNo === startLine
      if (isIssueLine) {
        yield* Console.error(`> ${gutter} | ${lineText}`)
        const underlineStart = Math.max(0, startColumn - 1)
        const underlineEnd = Math.max(underlineStart, endColumn - 1)
        const underlineLength = Math.max(1, underlineEnd - underlineStart || 1)
        const caretLine = " ".repeat(underlineStart) + "^".repeat(underlineLength)
        yield* Console.error(`${" ".repeat(1)} ${" ".repeat(lineNoWidth)} | ${caretLine}`)
      } else {
        yield* Console.info(`  ${gutter} | ${lineText}`)
      }
    }
    return yield* Console.error(" |")
  })

export const renderSchemaError = (error: Schema.SchemaError) => {
  if (error.issue._tag === "InvalidValue") {
    const kdlIssues = error.issue.annotations?.kdlIssues as KdlValueIssue[] | undefined
    const parseFromOptions = error.issue.annotations?.parseFromOptions as ParseContext | undefined

    if (kdlIssues && kdlIssues.length > 0 && parseFromOptions) {
      return Effect.forEach(
        kdlIssues,
        (payload) => rendererMap[payload._type](payload as any, parseFromOptions),
        { discard: true }
      )
    }
  }
  return Console.error(standardSchemaFormatter(error.issue))
}

export const invalid = (
  issues: ReadonlyArray<KdlValueIssue>,
  ctx: ParseContext
) =>
  Effect.fail(
    new Schema.SchemaError(
      new SchemaIssue.InvalidValue(Option.none(), {
        kdlIssues: issues,
        parseFromOptions: ctx
      })
    )
  )
