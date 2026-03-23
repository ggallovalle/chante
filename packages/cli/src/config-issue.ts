import { Console, Effect, Schema, SchemaIssue, Option } from "effect"
import type { StoredLocation, Node } from "@bgotink/kdl"

export type MissingRequireIssue = {
  _type: "MissingRequire"
  bundle: string | undefined
  require: string
  location: StoredLocation
}

export type RequiredChildIssue = {
  _type: "RequiredChild"
  child: string
  location: StoredLocation
}

export type RequiredArgumentIssue = {
  _type: "RequiredArgumentIssue"
  index: number
  node: Node
  location: StoredLocation
}

export type MissingPathIssue = {
  _type: "MissingPath"
  label: string
  path: string
  location: StoredLocation
}

export type ExpectedOneOfIssue = {
  _type: "ExpectedOneOf"
  actual: string
  expected: ReadonlyArray<string>
  location: StoredLocation
}

export type DuplicateNameIssue = {
  _type: "DuplicateName"
  entity: string
  name: string
  first: StoredLocation
  duplicate: StoredLocation
}

export type KdlIssue =
  | MissingRequireIssue
  | RequiredChildIssue
  | RequiredArgumentIssue
  | MissingPathIssue
  | ExpectedOneOfIssue
  | DuplicateNameIssue

export type ParseContext = {
  path: string
  content: string
  fileName: string
}

const standardSchemaFormatter = SchemaIssue.makeFormatterStandardSchemaV1()

type RendererMap = {
  [K in KdlIssue["_type"]]: (
    payload: Extract<KdlIssue, { _type: K }>,
    shared: ParseContext
  ) => Effect.Effect<void>
}

const ERR = "[X]"
const HINT = "[?]"

const rendererMap: RendererMap = {
  RequiredChild: (_payload, shared) => Effect.gen(function*() {
    const header = `${ERR} config missing required '${_payload.child}' block`
    yield* renderSimpleSnippet(shared, _payload.location, header)
    yield* Console.info(`${HINT} add a '${_payload.child}' block to the root config`)
  }),
  RequiredArgumentIssue: (_payload, shared) => Effect.gen(function*() {
    const header = `${ERR} node '${_payload.node.name.name}' missing required argument index '${_payload.index}'`
    yield* renderSimpleSnippet(shared, _payload.location, header)
    yield* Console.info(`${HINT} provide argument #${_payload.index + 1}`)
  }),
  MissingRequire: (payload, shared) => Effect.gen(function*() {
    const headerBundle = payload.bundle ?? "<unknown bundle>"
    const header = `${ERR} bundle \"${headerBundle}\" requires unknown package \"${payload.require}\"`
    yield* renderSimpleSnippet(shared, payload.location, header)
    yield* Console.info(`${HINT} add package \"${payload.require}\" to packages { ... }`)
  }),
  MissingPath: (payload, shared) => Effect.gen(function*() {
    const header = `${ERR} path for '${payload.label}' does not exist: ${payload.path}`
    yield* renderSimpleSnippet(shared, payload.location, header)
    yield* Console.info(`${HINT} create the path or update settings.paths.${payload.label}`)
  }),
  ExpectedOneOf: (payload, shared) => Effect.gen(function*() {
    const header = `${ERR} unsupported operation '${payload.actual}'`
    yield* renderSimpleSnippet(shared, payload.location, header)
    yield* Console.info(`${HINT} expected one of: ${payload.expected.join(", ")}`)
  }),
  DuplicateName: (payload, shared) => Effect.gen(function*() {
    const header = `${ERR} duplicate ${payload.entity} \"${payload.name}\"`
    yield* renderMultiLabelSnippet(shared, {
      header,
      labels: [
        { location: payload.duplicate, message: "duplicate defined here", marker: "^" },
        { location: payload.first, message: "first defined here", marker: "~" }
      ]
    })
    yield* Console.info(`${HINT} rename or remove one of the '${payload.name}' ${payload.entity}s`)
  })
}

type LabelledLocation = {
  location: StoredLocation
  message: string
  marker: string
}

type MultiLabelSnippet = {
  header: string
  labels: ReadonlyArray<LabelledLocation>
}

const renderMultiLabelSnippet = (shared: ParseContext, snippet: MultiLabelSnippet) =>
  Effect.gen(function*() {
    if (snippet.labels.length === 0) {
      return yield* Console.info(snippet.header)
    }

    const lines = shared.content.split(/\r?\n/)
    const minLine = Math.min(...snippet.labels.map((l) => l.location.start.line))
    const maxLine = Math.max(...snippet.labels.map((l) => l.location.end.line))
    const contextStart = Math.max(1, minLine - 2)
    const contextEnd = Math.min(lines.length, maxLine + 2)
    const lineNoWidth = String(contextEnd).length

    yield* Console.info(snippet.header)
    yield* Console.info(`--> ${shared.path}:${minLine}:${snippet.labels[0]!.location.start.column}`)
    yield* Console.error(" |")

    const labelsByLine = new Map<number, LabelledLocation[]>()
    for (const label of snippet.labels) {
      const line = label.location.start.line
      const arr = labelsByLine.get(line) ?? []
      arr.push(label)
      labelsByLine.set(line, arr)
    }

    for (let lineNo = contextStart; lineNo <= contextEnd; lineNo++) {
      const lineText = lines[lineNo - 1] ?? ""
      const gutter = String(lineNo).padStart(lineNoWidth, " ")
      const labels = labelsByLine.get(lineNo)
      const hasLabels = labels && labels.length > 0
      const marker = hasLabels ? ">" : " "
      if (hasLabels) {
        yield* Console.error(`${marker} ${gutter} | ${lineText}`)
        for (const label of labels!) {
          const underlineStart = Math.max(0, label.location.start.column - 1)
          const underlineEnd = Math.max(underlineStart, label.location.end.column - 1)
          const underlineLength = Math.max(1, underlineEnd - underlineStart || 1)
          const caretLine = " ".repeat(underlineStart) + label.marker.repeat(underlineLength)
          yield* Console.error(`${" ".repeat(1)} ${" ".repeat(lineNoWidth)} | ${caretLine} ${label.message}`)
        }
      } else {
        yield* Console.info(`${marker} ${gutter} | ${lineText}`)
      }
    }
    return yield* Console.error(" |")
  })

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
    const kdlIssues = error.issue.annotations?.kdlIssues as KdlIssue[] | undefined
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
  issues: ReadonlyArray<KdlIssue>,
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
