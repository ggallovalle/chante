import type { Node, StoredLocation } from "@bgotink/kdl"
import { codeToANSI } from "@shikijs/cli"
import { Console, Effect, Option, Schema, SchemaIssue } from "effect"
import type { IOutput } from "~/output.js"
import { Output } from "~/output.js"

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
    shared: ParseContext,
    output: IOutput,
  ) => Effect.Effect<void>
}

const rendererMap: RendererMap = {
  RequiredChild: (_payload, shared, output) =>
    Effect.gen(function* () {
      yield* output.errorMsg(
        `config missing required '${_payload.child}' block`,
      )
      yield* renderSimpleSnippet(shared, _payload.location, output)
      yield* output.hintMsg(
        `add a '${_payload.child}' block to the root config`,
      )
    }),
  RequiredArgumentIssue: (payload, shared, output) =>
    Effect.gen(function* () {
      yield* output.errorMsg(
        `node '${payload.node.name.name}' missing required argument index '${payload.index}'`,
      )
      yield* renderSimpleSnippet(shared, payload.location, output)
      yield* output.hintMsg(`provide argument #${payload.index + 1}`)
    }),
  MissingRequire: (payload, shared, output) =>
    Effect.gen(function* () {
      const headerBundle = payload.bundle ?? "<unknown bundle>"
      yield* output.errorMsg(
        `bundle "${headerBundle}" requires unknown package "${payload.require}"`,
      )
      yield* renderSimpleSnippet(shared, payload.location, output)
      yield* output.hintMsg(
        `add package "${payload.require}" to packages { ... }`,
      )
    }),
  MissingPath: (payload, shared, output) =>
    Effect.gen(function* () {
      yield* output.errorMsg(
        `path for '${payload.label}' does not exist: ${payload.path}`,
      )
      yield* renderSimpleSnippet(shared, payload.location, output)
      yield* output.hintMsg(
        `create the path or update settings.paths.${payload.label}`,
      )
    }),
  ExpectedOneOf: (payload, shared, output) =>
    Effect.gen(function* () {
      yield* output.errorMsg(`unsupported node '${payload.actual}'`)
      yield* renderSimpleSnippet(shared, payload.location, output)
      yield* output.hintMsg(`expected one of: ${payload.expected.join(", ")}`)
    }),
  DuplicateName: (payload, shared, output) =>
    Effect.gen(function* () {
      yield* output.errorMsg(`duplicate ${payload.entity} "${payload.name}"`)
      yield* renderMultiLabelSnippet(shared, [
        {
          location: payload.duplicate,
          message: "duplicate defined here",
          marker: "^",
        },
        { location: payload.first, message: "first defined here", marker: "~" },
      ])
      yield* output.hintMsg(
        `rename or remove one of the '${payload.name}' ${payload.entity}s`,
      )
    }),
}

type LabelledLocation = {
  location: StoredLocation
  message: string
  marker: string
}

const kdlSyntaxHighlight = (content: string) =>
  Effect.promise(() => codeToANSI(content, "kdl", "github-dark"))

const renderMultiLabelSnippet = (
  shared: ParseContext,
  labels: LabelledLocation[],
) =>
  Effect.gen(function* () {
    const pretty = yield* kdlSyntaxHighlight(shared.content)
    const lines = pretty.split(/\r?\n/)
    const minLine = Math.min(...labels.map((l) => l.location.start.line))
    const maxLine = Math.max(...labels.map((l) => l.location.end.line))
    const contextStart = Math.max(1, minLine - 2)
    const contextEnd = Math.min(lines.length, maxLine + 2)
    const lineNoWidth = String(contextEnd).length

    yield* Console.info(
      `--> ${shared.path}:${minLine}:${labels[0]?.location.start.column}`,
    )
    yield* Console.error(" |")

    const labelsByLine = new Map<number, LabelledLocation[]>()
    for (const label of labels) {
      const line = label.location.start.line
      const arr = labelsByLine.get(line) ?? []
      arr.push(label)
      labelsByLine.set(line, arr)
    }

    for (let lineNo = contextStart; lineNo <= contextEnd; lineNo++) {
      const lineText = lines[lineNo - 1] ?? ""
      const gutter = String(lineNo).padStart(lineNoWidth, " ")
      const labelsForLine = labelsByLine.get(lineNo) ?? []
      const hasLabels = labelsForLine.length > 0
      const marker = hasLabels ? ">" : " "
      if (hasLabels) {
        yield* Console.error(`${marker} ${gutter} | ${lineText}`)
        for (const label of labelsForLine) {
          const underlineStart = Math.max(0, label.location.start.column - 1)
          const underlineEnd = Math.max(
            underlineStart,
            label.location.end.column - 1,
          )
          const underlineLength = Math.max(
            1,
            underlineEnd - underlineStart || 1,
          )
          const caretLine =
            " ".repeat(underlineStart) + label.marker.repeat(underlineLength)
          yield* Console.error(
            `${" ".repeat(1)} ${" ".repeat(lineNoWidth)} | ${caretLine} ${label.message}`,
          )
        }
      } else {
        yield* Console.info(`${marker} ${gutter} | ${lineText}`)
      }
    }
    return yield* Console.error(" |")
  })

const renderSimpleSnippet = (
  shared: ParseContext,
  location: StoredLocation,
  output: IOutput,
) =>
  Effect.gen(function* () {
    const pretty = yield* kdlSyntaxHighlight(shared.content)
    const lines = pretty.split(/\r?\n/)
    const startLine = location.start.line
    const endLine = location.end.line
    const startColumn = location.start.column
    const endColumn = location.end.column

    const contextStart = Math.max(1, startLine - 2)
    const contextEnd = Math.min(lines.length, endLine + 2)
    const lineNoWidth = String(contextEnd).length

    yield* output.logMsg(`--> ${shared.path}:${startLine}:${startColumn}`)
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
        const caretLine =
          " ".repeat(underlineStart) + "^".repeat(underlineLength)
        yield* Console.error(
          `${" ".repeat(1)} ${" ".repeat(lineNoWidth)} | ${caretLine}`,
        )
      } else {
        yield* Console.info(`  ${gutter} | ${lineText}`)
      }
    }
    return yield* Console.error(" |")
  })

export const renderSchemaError = Effect.fnUntraced(function* (
  error: Schema.SchemaError,
) {
  const output = yield* Output
  if (error.issue._tag === "InvalidValue") {
    const kdlIssues = error.issue.annotations?.["kdlIssues"] as
      | KdlIssue[]
      | undefined
    const parseFromOptions = error.issue.annotations?.["parseFromOptions"] as
      | ParseContext
      | undefined

    if (kdlIssues && kdlIssues.length > 0 && parseFromOptions) {
      return yield* Effect.forEach(
        kdlIssues,
        (payload) => {
          const render = rendererMap[payload._type] as (
            issue: KdlIssue,
            shared: ParseContext,
            output: IOutput,
          ) => Effect.Effect<void>
          return render(payload, parseFromOptions, output)
        },
        { discard: true },
      )
    }
  }

  const failure = standardSchemaFormatter(error.issue)
  for (const issue of failure.issues) {
    yield* output.errorKeyValue(
      issue.path?.join(".") ?? "<unknown>",
      issue.message,
    )
  }
})

export const invalid = (issues: ReadonlyArray<KdlIssue>, ctx: ParseContext) =>
  Effect.fail(
    new Schema.SchemaError(
      new SchemaIssue.InvalidValue(Option.none(), {
        kdlIssues: issues,
        parseFromOptions: ctx,
      }),
    ),
  )
