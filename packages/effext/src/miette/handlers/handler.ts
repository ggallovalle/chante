import { Schema, ServiceMap, type Stream } from "effect"
import type { Diagnostic } from "~/miette/diagnostic.js"
import { ThemeCharacters } from "./theme.js"

export class MietteHandlerOpts extends Schema.Class<MietteHandlerOpts>(
  "miette/MietteHandlerOpts",
)({
  linkify: Schema.optional(Schema.Boolean),
  width: Schema.optional(Schema.Number),
  theme: Schema.optional(ThemeCharacters),
  color: Schema.optional(Schema.Boolean),
  unicode: Schema.optional(Schema.Boolean),
  footer: Schema.optional(Schema.String),
  contextLines: Schema.optional(Schema.Number),
  tabWidth: Schema.optional(Schema.Number),
  withCauseChain: Schema.optional(Schema.Boolean),
  breakWords: Schema.optional(Schema.Boolean),
  wrapLines: Schema.optional(Schema.Boolean),
  showRelatedAsNested: Schema.optional(Schema.Boolean),
}) {
  static empty(): MietteHandlerOpts {
    return new MietteHandlerOpts({})
  }
}

export const TypeId = "~@kbroom/effext/miette/ReportHandler"

export interface IReportHandler {
  readonly [TypeId]: typeof TypeId
  renderReport(diagnostic: Diagnostic): Stream.Stream<string>
}

export class ReportHandler extends ServiceMap.Service<
  ReportHandler,
  IReportHandler
>()("@kbroom/effext/miette/ReportHandler") {
  public static make = (
    renderReport: (diagnostic: Diagnostic) => Stream.Stream<string>,
  ): IReportHandler => ({
    [TypeId]: TypeId,
    renderReport,
  })
}
