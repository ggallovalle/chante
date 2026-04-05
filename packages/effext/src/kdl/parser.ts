/** biome-ignore-all lint/style/noNonNullAssertion: becuas of regex match */
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
  SourceSpan,
  StringSourceCode,
} from "~/miette"

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

const extractKeywordInfo = (
  message: string,
  startOffset: number,
  _endOffset: number,
): {
  label: string
  help: string
  startOffset: number
  endOffset: number
} | null => {
  const caseMatch = message.match(
    /^Invalid keyword (.+), keywords are case sensitive, write (.+) instead$/,
  )
  if (caseMatch) {
    const keyword = caseMatch[1]!
    return {
      label: `Invalid keyword "${keyword}"`,
      help: `Keywords are case sensitive, write "${caseMatch[2]}" instead`,
      startOffset,
      endOffset: startOffset + keyword.length,
    }
  }

  const typoMatch = message.match(
    /^Invalid keyword (.+), did you mean #(\w+)\?$/,
  )
  if (typoMatch) {
    const keyword = typoMatch[1]!
    return {
      label: `Invalid keyword "${keyword}"`,
      help: `Did you mean #${typoMatch[2]}?`,
      startOffset,
      endOffset: startOffset + keyword.length,
    }
  }

  const surroundMatch = message.match(
    /^Invalid keyword (.+), surround it with quotes to use a string$/,
  )
  if (surroundMatch) {
    const keyword = surroundMatch[1]!
    return {
      label: `Invalid keyword "${keyword}"`,
      help: "Surround with quotes to use it as a string",
      startOffset,
      endOffset: startOffset + keyword.length,
    }
  }

  const identifierMatch = message.match(
    /^Invalid keyword "(.+)", add a leading # to use the keyword or surround with quotes to make it a string$/,
  )
  if (identifierMatch) {
    const keyword = identifierMatch[1]!
    return {
      label: `Invalid keyword "${keyword}"`,
      help: "Add a leading # to use the keyword or surround with quotes to make it a string",
      startOffset: startOffset - keyword.length,
      endOffset: startOffset,
    }
  }

  return null
}

const extractDiagnosticFromError = (
  error: InvalidKdlError,
  sourceCode: SourceCode,
): Diagnostic => {
  const labels: LabeledSpan[] = []
  let code = "kdl::parse_error"
  let help: string | undefined

  for (const e of error.flat()) {
    let startOffset = e.start?.offset ?? 0
    let endOffset = e.end?.offset ?? startOffset
    const message = e.message.replace(/\s+at\s+\d+:\d+$/, "")

    const keywordInfo = extractKeywordInfo(message, startOffset, endOffset)
    if (keywordInfo) {
      const span = SourceSpan.fromStartEnd(
        keywordInfo.startOffset,
        keywordInfo.endOffset,
      )
      labels.push(LabeledSpan.fromSpan(keywordInfo.label, span))
      code = "kdl::invalid_keyword"
      help = keywordInfo.help
    } else {
      if (endOffset === startOffset + 1) {
        startOffset = Math.max(0, startOffset - 1)
        endOffset = startOffset + 1
      }
      const span = SourceSpan.fromStartEnd(startOffset, endOffset)
      labels.push(LabeledSpan.fromSpan(message, span))
    }
  }

  return new Diagnostic({ code, labels, help, sourceCode })
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
