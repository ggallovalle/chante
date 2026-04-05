/** biome-ignore-all lint/style/noNonNullAssertion: because of regex match */
import type { InvalidKdlError } from "@bgotink/kdl"
import { Diagnostic, LabeledSpan, type SourceCode, SourceSpan } from "~/miette"

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

export const extractDiagnosticFromError = (
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
