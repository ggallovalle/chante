import { parse } from "@bgotink/kdl"
import {
  Effect,
  Option as EffectOption,
  Result,
  type Schema,
  type SchemaAST,
  SchemaIssue,
  SchemaParser,
} from "effect"
import type * as FileSystem from "effect/FileSystem"
import type * as Path from "effect/Path"
import {
  Diagnostic,
  FromFileSourceCode,
  LabeledSpan,
  META_DIAGNOSTIC,
} from "~/miette"

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

export const decodeSourceResult = <S extends Schema.Decoder<unknown>>(
  schema: S,
) => {
  const componentType = schema.ast.annotations?.["kdlComponent"]
  if (typeof componentType !== "string") {
    throw new Error(
      "The schema MUST be a KDL component, either 'value', 'node' or 'document'",
    )
  }

  const parser = SchemaParser.decodeUnknownResult(schema)
  return (
    source: string,
    options?: SchemaAST.ParseOptions,
  ): Result.Result<S["Type"], SchemaIssue.Issue> => {
    try {
      const kdl = parse(source, {
        // biome-ignore lint/suspicious/noExplicitAny: I know
        as: componentType as any,
        storeLocations: true,
      })
      return parser(kdl, options)
      // biome-ignore lint/suspicious/noExplicitAny: I know
    } catch (error: any) {
      return Result.fail(
        new SchemaIssue.InvalidValue(EffectOption.some(source), {
          message: error.message,
        }),
      )
    }
  }
}

export const diagnostFile = <S extends Schema.Decoder<unknown>>(schema: S) => {
  const componentType = schema.ast.annotations?.["kdlComponent"]
  if (typeof componentType !== "string") {
    throw new Error(
      "The schema MUST be a KDL component, either 'value', 'node' or 'document'",
    )
  }
  const parser = SchemaParser.decodeUnknownEffect(schema)
  const curried = Effect.fnUntraced(function* (path: string) {
    const [sourceCode, source] = yield* Effect.orDie(
      FromFileSourceCode.fromFileContent(path, "kdl"),
    )
    const kdl = parse(source, {
      // biome-ignore lint/suspicious/noExplicitAny: I know
      as: componentType as any,
      storeLocations: true,
    })
    const result = yield* parser(kdl).pipe(
      Effect.mapError((issue) => {
        const diagnostic = extractDiagnostic(issue)
        diagnostic.sourceCode = sourceCode
        return diagnostic
      }),
    )
    return result
  }) as (
    path: string,
  ) => Effect.Effect<S["Type"], Diagnostic, FileSystem.FileSystem | Path.Path>
  return curried
}
