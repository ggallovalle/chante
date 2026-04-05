export { Diagnostic, isDiagnostic, type Severity } from "~/miette/diagnostic.js"
export {
  IoError,
  isMietteError,
  type MietteError,
  OutOfBounds,
} from "~/miette/error.js"
export {
  GraphicalReportHandler,
  OptimizedGraphicalReportHandler,
} from "~/miette/handlers/graphical.js"
export {
  type IReportHandler,
  MietteHandlerOpts,
  ReportHandler,
  TypeId as ReportHandlerTypeId,
} from "~/miette/handlers/handler.js"
export { JsonReportHandler } from "~/miette/handlers/json.js"
export { NarratableReportHandler } from "~/miette/handlers/narratable.js"
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
