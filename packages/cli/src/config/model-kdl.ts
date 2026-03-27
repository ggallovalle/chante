import {
  type Document,
  type Entry,
  getLocation,
  type Identifier,
  Value as ModelValue,
  type Node,
  parse,
  type Tag,
} from "@bgotink/kdl"
import {
  Effect,
  Option,
  Result,
  Schema,
  type SchemaAST,
  SchemaIssue,
  SchemaParser,
} from "effect"

import { SourceSpan } from "~/miette.js"

export type ModelComponent =
  | ModelValue
  | Identifier
  | Tag
  | Entry
  | Node
  | Document

export interface Value<T> {
  readonly value: T
  readonly tag: string | null
  readonly span: SourceSpan | undefined
}

export interface ValueSchema<A extends Schema.Top>
  extends Schema.declareConstructor<
    Value<A["Type"]>,
    ModelValue,
    readonly [A]
  > {}

export const Value = <A extends Schema.Top>(inner: A): ValueSchema<A> =>
  Schema.declareConstructor<Value<A["Type"]>, ModelValue>()(
    [inner],
    ([valueCodec]) =>
      (component, ast, options) => {
        if (!(component instanceof ModelValue)) {
          return Effect.fail(
            new SchemaIssue.InvalidType(ast, Option.some(component)),
          )
        }
        // I want to add this annotation to the underlaying issue
        const value = component.getValue()
        const parser = SchemaParser.decodeUnknownEffect(valueCodec)(
          value,
          options,
        )

        return Effect.mapBothEager(parser, {
          onSuccess: (value) => ({
            value,
            tag: component.getTag(),
            span: span(component),
          }),
          // <- here
          onFailure: (issue) => {
            // console.log(issue)
            return new SchemaIssue.InvalidValue(
              Option.some(value),
              meta(component, findMessage(issue)),
            )
          },
        })
      },
    { kdlComponent: "value" },
  )

export const decodeSourceResult = <S extends Schema.Decoder<unknown>>(
  schema: S,
) => {
  const componentType = schema.ast.annotations?.["kdlComponent"]
  if (typeof componentType !== "string") {
    throw new Error(
      "The schema MUST be a KDL component, AKA either a Value<T> | ",
    )
  }

  const parser = SchemaParser.decodeUnknownResult(schema)
  return (
    source: string,
    options?: SchemaAST.ParseOptions,
  ): Result.Result<S["Type"], SchemaIssue.Issue> => {
    try {
      const kdl = parse(source, {
        // biome-ignore lint/suspicious/noExplicitAny: I know
        as: componentType as any,
        storeLocations: true,
      })
      return parser(kdl, options)
      // biome-ignore lint/suspicious/noExplicitAny: I know
    } catch (error: any) {
      return Result.fail(
        new SchemaIssue.InvalidValue(Option.some(source), {
          message: error.message,
        }),
      )
    }
  }
}

function getMessageAnnotation(
  annotations: Schema.Annotations.Annotations | undefined,
  type: "message" | "messageMissingKey" | "messageUnexpectedKey" = "message",
): string | undefined {
  const message = annotations?.[type]
  if (typeof message === "string") return message
  return undefined
}

// why is this not exported ??? or a Issue.message or something
function findMessage(issue: SchemaIssue.Issue): string | undefined {
  switch (issue._tag) {
    case "InvalidType":
    case "OneOf":
    case "Composite":
    case "AnyOf":
      return getMessageAnnotation(issue.ast.annotations) ?? issue.toString()
    case "InvalidValue":
    case "Forbidden":
      return getMessageAnnotation(issue.annotations)
    case "MissingKey":
      return getMessageAnnotation(issue.annotations, "messageMissingKey")
    case "UnexpectedKey":
      return getMessageAnnotation(issue.ast.annotations, "messageUnexpectedKey")
    case "Filter":
      return getMessageAnnotation(issue.filter.annotations)
    case "Encoding":
      return findMessage(issue.issue)
    default:
      return undefined
  }
}

function span(component: ModelComponent) {
  const location = getLocation(component)
  if (location === undefined) return undefined
  return SourceSpan.fromStartEnd(location.start.offset, location.end.offset)
}

function meta(component: ModelComponent, message?: string) {
  return {
    message: message ?? "Some unknown error",
    kdlComponent: component,
    kdlSpan: span(component),
  }
}
