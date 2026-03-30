export { Diagnostic, isDiagnostic } from "./diagnostic.js"
export {
  IoError,
  isMietteError,
  type MietteError,
  OutOfBounds,
} from "./error.js"
export { GraphicalReportHandler } from "./handlers/graphical.js"
export { MietteHandlerOpts } from "./handlers/handler.js"
export { ThemeCharacters } from "./handlers/theme.js"
export {
  LabeledSpan,
  SourceSpan,
  SpanContents,
} from "./protocol.js"
export {
  FromFileSourceCode,
  type SourceCode,
  StringSourceCode,
} from "./source-code.js"

export const META_SPAN = "mietteSpan"
export const META_DIAGNOSTIC = "mietteDiagnostic"
