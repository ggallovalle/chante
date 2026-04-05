export { Diagnostic, isDiagnostic, type Severity } from "~/miette/diagnostic.js"
export {
  IoError,
  isMietteError,
  type MietteError,
  OutOfBounds,
} from "~/miette/error.js"
export { GraphicalReportHandler } from "~/miette/handlers/graphical.js"
export { MietteHandlerOpts } from "~/miette/handlers/handler.js"
export { ThemeCharacters } from "~/miette/handlers/theme.js"
export {
  LabeledSpan,
  SourceSpan,
  SpanContents,
} from "~/miette/protocol.js"
export {
  FromFileSourceCode,
  SourceCode,
  StringSourceCode,
} from "~/miette/source-code.js"

export const META_DIAGNOSTIC = "mietteDiagnostic"
