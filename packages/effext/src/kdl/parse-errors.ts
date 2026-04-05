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

type ParseErrorInfo = {
  label: string
  help: string
  code: string
} | null

const extractParseErrorInfo = (message: string): ParseErrorInfo => {
  if (message.startsWith("Invalid node children")) {
    return {
      label: "Invalid node children",
      help: "Check for missing closing brace",
      code: "kdl::invalid_node_children",
    }
  }

  if (message.startsWith("Expected a value")) {
    return {
      label: "Expected a value",
      help: "Add a value after the property name",
      code: "kdl::expected_value",
    }
  }

  if (message.startsWith("Invalid tag")) {
    return {
      label: "Invalid tag",
      help: "Surround the tag with quotes to use it as a string",
      code: "kdl::invalid_tag",
    }
  }

  if (message.startsWith("Invalid argument")) {
    return {
      label: "Invalid argument",
      help: "Check the argument syntax",
      code: "kdl::invalid_argument",
    }
  }

  const unexpectedTokenMatch = message.match(
    /^Unexpected token "(.)", did you forget to quote an identifier\?$/,
  )
  if (unexpectedTokenMatch) {
    return {
      label: `Unexpected token "${unexpectedTokenMatch[1]}"`,
      help: "Did you forget to quote an identifier?",
      code: "kdl::unexpected_token",
    }
  }

  const unexpectedCharMatch = message.match(
    /^Unexpected character "(.)", did you forget to quote an identifier\?$/,
  )
  if (unexpectedCharMatch) {
    return {
      label: `Unexpected character "${unexpectedCharMatch[1]}"`,
      help: "Did you forget to quote an identifier?",
      code: "kdl::unexpected_character",
    }
  }

  if (message.startsWith("Unexpected EOF inside string")) {
    return {
      label: "Unclosed string",
      help: "Add the closing quote",
      code: "kdl::unclosed_string",
    }
  }

  if (message.startsWith("Invalid decimal number")) {
    return {
      label: "Invalid decimal number",
      help: "Check the decimal number syntax",
      code: "kdl::invalid_decimal",
    }
  }

  if (message.startsWith("Invalid number with suffix")) {
    return {
      label: "Invalid number with suffix",
      help: "A number with an exponent cannot have a suffix",
      code: "kdl::invalid_number_suffix",
    }
  }

  if (
    message.startsWith(
      "Expected newline or single-line comment after backslash",
    )
  ) {
    return {
      label: "Invalid escape sequence",
      help: "Use a valid escape sequence or remove the backslash",
      code: "kdl::invalid_escape",
    }
  }

  if (message.startsWith("A node can only have one children block")) {
    return {
      label: "Multiple children blocks",
      help: "A node can only have one children block",
      code: "kdl::multiple_children_blocks",
    }
  }

  if (message.startsWith("Unexpected hashed suffix")) {
    if (message.includes("on a string")) {
      return {
        label: "Unexpected hashed suffix on a string",
        help: "Only numbers can have suffixes",
        code: "kdl::unexpected_hashed_suffix",
      }
    }
    return {
      label: "Unexpected hashed suffix",
      help: "Only numbers can have suffixes",
      code: "kdl::unexpected_hashed_suffix",
    }
  }

  if (
    message.startsWith("This type of whitespace is not allowed inside a tag")
  ) {
    return {
      label: "Invalid tag whitespace",
      help: "Whitespace is not allowed inside a tag",
      code: "kdl::invalid_tag_whitespace",
    }
  }

  const unexpectedEqualsMatch = message.match(/^Unexpected equals sign(.*)$/)
  if (unexpectedEqualsMatch) {
    const rest = unexpectedEqualsMatch[1]
    return {
      label: "Unexpected equals sign",
      help: rest
        ? rest.replace(
            ", did you forget to quote the property name?",
            " - properties are name=(tag)value not (tag)name=value",
          )
        : "Check the property syntax",
      code: "kdl::unexpected_equals",
    }
  }

  if (
    message.startsWith("A number suffix cannot be combined with a regular tag")
  ) {
    return {
      label: "Suffix and tag conflict",
      help: "A number suffix cannot be combined with a regular tag",
      code: "kdl::suffix_tag_conflict",
    }
  }

  if (message.startsWith("Expected a property or argument")) {
    return {
      label: "Expected property or argument",
      help: "Add a property or argument here",
      code: "kdl::expected_property_or_argument",
    }
  }

  if (message.startsWith("Invalid suffix")) {
    return {
      label: "Invalid suffix",
      help: "Values that look like keywords cannot be used as suffixes",
      code: "kdl::invalid_suffix",
    }
  }

  const invalidCharMatch = message.match(
    /^Invalid character \\u\{([0-9a-f]+)\}/,
  )
  if (invalidCharMatch) {
    return {
      label: `Invalid character \\u{${invalidCharMatch[1]}}`,
      help: "This character is not allowed in KDL",
      code: "kdl::invalid_character",
    }
  }

  if (message.startsWith("Unexpected EOF in multiline comment")) {
    return {
      label: "Unclosed comment",
      help: "Add the closing */ to close the multiline comment",
      code: "kdl::unclosed_comment",
    }
  }

  if (
    message.startsWith("Unexpected keyword, did you forget to add whitespace")
  ) {
    return {
      label: "Unexpected keyword",
      help: "Did you forget to add whitespace before the keyword?",
      code: "kdl::unexpected_keyword",
    }
  }

  const invalidUnicodeMatch = message.match(
    /^Invalid unicode escape "(.*?)"(, did you forget.*)?$/,
  )
  if (invalidUnicodeMatch) {
    return {
      label: `Invalid unicode escape "${invalidUnicodeMatch[1]}"`,
      help: "Use a valid unicode scalar value (0x0 to 0x10FFFF)",
      code: "kdl::invalid_unicode_escape",
    }
  }

  if (message.startsWith("Unexpected slashdash")) {
    return {
      label: "Unexpected slashdash",
      help: "Add a node name or whitespace after /-",
      code: "kdl::unexpected_slashdash",
    }
  }

  if (message.startsWith("Expected space after slashdashed")) {
    return {
      label: "Expected space after slashdashed",
      help: "Add whitespace after the /- prefix",
      code: "kdl::expected_space_after_slashdash",
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
      const parseErrorInfo = extractParseErrorInfo(message)
      if (parseErrorInfo) {
        code = parseErrorInfo.code
        help = parseErrorInfo.help
        if (endOffset <= startOffset + 1) {
          startOffset = Math.max(0, startOffset - 1)
          endOffset = startOffset + 1
        }
        const span = SourceSpan.fromStartEnd(startOffset, endOffset)
        labels.push(LabeledSpan.fromSpan(parseErrorInfo.label, span))
      } else {
        if (endOffset <= startOffset + 1) {
          startOffset = Math.max(0, startOffset - 1)
          endOffset = startOffset + 1
        }
        const span = SourceSpan.fromStartEnd(startOffset, endOffset)
        labels.push(LabeledSpan.fromSpan(message, span))
      }
    }
  }

  return new Diagnostic({ code, labels, help, sourceCode })
}
