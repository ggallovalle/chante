import { Stream, Effect, Schema, Queue, Cause } from "effect"
import { GraphicalTheme } from "./theme.js"
import { Diagnostic } from "../diagnostic.js"
import { SourceCode } from "../source-code.js"


export class GraphicalReportHandler extends Schema.Class<GraphicalReportHandler>("GraphicalReportHandler")({
  termwidth: Schema.Number,
  theme: GraphicalTheme,
  footer: Schema.optional(Schema.String),
  contextLines: Schema.Number,
  tabWidth: Schema.Number,
  withCauseChain: Schema.Boolean,
  wrapLines: Schema.Boolean,
  breakWords: Schema.Boolean,
  withPrimarySpanStart: Schema.Boolean,
  linkDisplayText: Schema.optional(Schema.String),
  showRelatedAsNested: Schema.Boolean,
}) {

  public static default() {
    return new GraphicalReportHandler({
      termwidth: 200,
      theme: GraphicalTheme.default(),
      footer: undefined,
      contextLines: 3,
      tabWidth: 3,
      withCauseChain: true,
      wrapLines: true,
      breakWords: true,
      withPrimarySpanStart: true,
      linkDisplayText: "(link)",
      showRelatedAsNested: false,
    })
  }

  public renderReport(diagnostic: Diagnostic) {
    const self = this
    return Stream.callback<string>((queue) => {
      return Effect.gen(function*() {
        yield* Effect.log("starting report")
        yield* Queue.offer(queue, "hello world")
        yield* Queue.offer(queue, "hello world")
        yield* self.renderReportInner(queue, diagnostic, diagnostic.sourceCode)
        yield* Queue.end(queue)
      })
    })
  }

  private renderReportInner(queue: Queue.Queue<string, Cause.Done>, diagnostic: Diagnostic, parentSrc?: SourceCode) {
    const self = this
    return Effect.gen(function*() {
      const src: SourceCode | undefined = diagnostic.sourceCode ?? parentSrc
      yield* Queue.offer(queue, "hello inner")
      yield* Queue.offer(queue, "hello inner")
      yield* self.renderHeader(queue, diagnostic, false)
    })
  }

  private renderHeader(queue: Queue.Queue<string, Cause.Done>, diagnostic: Diagnostic, isNested: boolean) {
    return Effect.gen(function*() {
      yield* Queue.offer(queue, "hello header")
      yield* Queue.offer(queue, "hello header")
    })
  }
}


