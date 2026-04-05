import { InvalidKdlError, parse } from "@bgotink/kdl"
import { Effect, type Schema, type SchemaIssue, SchemaParser } from "effect"
import type * as FileSystem from "effect/FileSystem"
import type * as Path from "effect/Path"
import {
  Diagnostic,
  FromFileSourceCode,
  LabeledSpan,
  META_DIAGNOSTIC,
  type SourceCode,
  StringSourceCode,
} from "~/miette"
import { extractDiagnosticFromError } from "./parse-errors.js"

export const diagnostFile = <S extends Schema.Decoder<unknown>>(
  schema: S,
): ((
  path: string,
) => Effect.Effect<
  S["Type"],
  Diagnostic,
  FileSystem.FileSystem | Path.Path | S["DecodingServices"]
>) => {
  const parse = parseKdl(schema)
  return Effect.fnUntraced(function* (path: string) {
    const [sourceCode, source] = yield* Effect.orDie(
      FromFileSourceCode.fromFileContent(path, "kdl"),
    )
    return yield* parse(source, sourceCode)
  })
}

export const diagnosticString = <S extends Schema.Decoder<unknown>>(
  schema: S,
) => {
  const parse = parseKdl(schema)
  return (source: string) => {
    const sourceCode = new StringSourceCode(source)
    return parse(source, sourceCode)
  }
}

function getAnnotation(
  issue: SchemaIssue.Issue,
  acc: Schema.Annotations.Annotations[],
) {
  switch (issue._tag) {
    case "Composite":
      return getAnnotation(issue.issues[0], acc)
    case "Pointer":
      return getAnnotation(issue.issue, acc)
    case "InvalidValue":
      if (issue.annotations !== undefined) {
        acc.push(issue.annotations)
      }
      return acc
    default:
      return acc
  }
}

const getDiagnosticFromAnnotations = (
  issue: SchemaIssue.Issue,
): Diagnostic | undefined => {
  const annotation = getAnnotation(issue, [])[0]
  const meta = annotation?.[META_DIAGNOSTIC]
  if (meta instanceof Diagnostic) {
    return meta
  }
  return undefined
}

const extractDiagnostic = (issue: SchemaIssue.Issue): Diagnostic => {
  const fromAnnotations = getDiagnosticFromAnnotations(issue)
  if (fromAnnotations) {
    return fromAnnotations
  }

  return new Diagnostic({
    code: "kdl::parse_error",
    labels: [LabeledSpan.message(issue.toString())],
  })
}

const parseKdl = <S extends Schema.Decoder<unknown>>(schema: S) => {
  const parser = SchemaParser.decodeUnknownEffect(schema)
  return (source: string, sourceCode: SourceCode) => {
    try {
      const kdl = parse(source, {
        storeLocations: true,
      })
      return parser(kdl).pipe(
        Effect.mapError((issue) => {
          const diagnostic = extractDiagnostic(issue)
          diagnostic.sourceCode = sourceCode
          return diagnostic
        }),
      )
    } catch (error) {
      if (error instanceof InvalidKdlError) {
        return Effect.fail(extractDiagnosticFromError(error, sourceCode))
      }
      throw error
    }
  }
}
