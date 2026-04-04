import { Data, Predicate, Schema } from "effect"
import { LabeledSpan } from "./protocol.js"

const TypeId = "~miette/Diagnostic"

export const isDiagnostic = (u: unknown): u is Diagnostic =>
  Predicate.hasProperty(u, TypeId)

export type Severity = "advice" | "warning" | "error" | undefined

export class DiagnosticAbc extends Schema.ErrorClass(TypeId)({
  // export class Diagnostic extends Schema.ErrorClass(TypeId)({
  _tag: Schema.tag("Diagnostic"),
  info: Schema.String,
  cause: Schema.optional(Schema.Unknown),
  template: Schema.optional(Schema.String),
  meta: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
  code: Schema.optional(Schema.String).annotate({
    description:
      "Unique diagnostic code that can be used to look up more information about this Diagnostic. Ideally also globally unique, and documented in the toplevel crate’s documentation for easy searching. Rust path format (foo::bar::baz) is recommended, but more classic codes like E0123 or enums will work just fine.",
  }),
  severity: Schema.optional(
    Schema.Literals(["advice", "warning", "error"]),
  ).annotate({
    description: `Diagnostic severity. This may be used by ReportHandlers to change the display format of this diagnostic.

If None, reporters should treat this as Severity::Error.`,
  }),
  help: Schema.optional(Schema.String).annotate({
    description:
      "Additional help text related to this Diagnostic. Do you have any advice for the poor soul who’s just run into this issue?",
  }),
  url: Schema.optional(Schema.String).annotate({
    description:
      "URL to visit for a more detailed explanation/help about this Diagnostic.",
  }),
  sourceCode: Schema.optional(Schema.Any).annotate({
    description:
      "Source code to apply this Diagnostic’s Diagnostic::labels to.",
  }),
  labels: Schema.optional(Schema.Array(LabeledSpan)).annotate({
    description: "Labels to apply to this Diagnostic’s Diagnostic::source_code",
  }),
  related: Schema.optional(
    Schema.Array(
      // biome-ignore lint/suspicious/noExplicitAny: because of schema suspend quirk
      Schema.suspend((): Schema.Codec<Diagnostic> => Diagnostic as any),
    ),
  ).annotate({
    description: "Additional related Diagnostics.",
  }),
  diagnosticSource: Schema.optional(
    // biome-ignore lint/suspicious/noExplicitAny: because of schema suspend quirk
    Schema.suspend((): Schema.Codec<Diagnostic> => Diagnostic as any),
  ).annotate({
    description: "The cause of the error.",
  }),
}) {
  /**
   * @since 4.0.0
   */
  readonly [TypeId] = TypeId

  get severityValue() {
    return this.severity ?? "error"
  }

  override get message() {
    const code = this.code === "undefined" ? "" : `(${this.code})`
    return `${this.severityValue}: ${code} ${this.info}`
  }

  toJSON() {
    return {
      code: this.code,
      message: this.info,
      severity: this.severityValue,
    }
  }

  override toString() {
    return `Diagnostic(${this.message})`
  }
}

export class Diagnostic extends Data.TaggedError("Diagnostic")<{
  info: string
  cause?: unknown
  template?: string
  // biome-ignore lint/suspicious/noExplicitAny: I know
  meta?: Record<string, any>
  code?: string
  severity?: Severity
  help?: string
  url?: string
  // biome-ignore lint/suspicious/noExplicitAny: I know
  sourceCode?: any
  labels?: Array<LabeledSpan>
  related?: Array<Diagnostic>
  diagnosticSource?: Diagnostic
}> {
  /**
   * @since 4.0.0
   */
  readonly [TypeId] = TypeId

  get severityValue() {
    return this.severity ?? "error"
  }

  override get message() {
    const code = this.code === "undefined" ? "" : `(${this.code})`
    return `${this.severityValue}: ${code} ${this.info}`
  }

  toJSON() {
    return {
      code: this.code,
      message: this.info,
      severity: this.severityValue,
    }
  }

  override toString() {
    return `Diagnostic(${this.message})`
  }
}
