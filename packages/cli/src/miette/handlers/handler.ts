import { Schema } from "effect"
import { GraphicalTheme } from "~/miette/handlers/theme.js"

export class MietteHandlerOpts extends Schema.Class<MietteHandlerOpts>(
  "miette/MietteHandlerOpts",
)({
  linkify: Schema.optional(Schema.Boolean),
  width: Schema.optional(Schema.Number),
  theme: Schema.optional(GraphicalTheme),
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
