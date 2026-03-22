import { Console, Effect, Schema, SchemaIssue } from "effect"
import type { StoredLocation } from "@bgotink/kdl"

export type MissingRequirePayload = {
  _type: "MissingRequire"
  bundle: string | undefined
  require: string
  location: StoredLocation
}

export type KdlValueIssue = MissingRequirePayload

export type CustomIssuesAnnotation = {
  path: string
  content: string
}

const standardSchemaFormatter = SchemaIssue.makeFormatterStandardSchemaV1()

type RendererMap = {
  [K in KdlValueIssue["_type"]]: (
    payload: Extract<KdlValueIssue, { _type: K }>,
    shared: CustomIssuesAnnotation
  ) => Effect.Effect<void>
}

const rendererMap: RendererMap = {
  MissingRequire: (payload, shared) => Effect.gen(function*() {
    const headerBundle = payload.bundle ?? "<unknown bundle>"
    const header = `bundle \"${headerBundle}\" requires unknown package \"${payload.require}\"`
    const location = payload.location

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
      const marker = isIssueLine ? ">" : " "
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
      if (lineNo === startLine) {
      }
    }
    return yield* Console.error(" |")
  })
}

export const renderSchemaError = (error: Schema.SchemaError) => {
  if (error.issue._tag === "InvalidValue") {
    const kdlIssues = error.issue.annotations?.kdlIssues as KdlValueIssue[] | undefined
    const parseFromOptions = error.issue.annotations?.parseFromOptions as any

    if (kdlIssues && kdlIssues.length > 0) {
      return Effect.forEach(
        kdlIssues,
        (payload) => rendererMap[payload._type](payload as any, parseFromOptions),
        { discard: true }
      )
    }
  }
  return Console.error(standardSchemaFormatter(error.issue))
}
