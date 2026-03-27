import { getLocation, Value as ModelValue, parse } from "@bgotink/kdl"
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
import type * as Model from "./model.js"

export interface Value<A extends Schema.Top>
  extends Schema.declareConstructor<
    Model.Value<A["Type"]>,
    ModelValue,
    readonly [A]
  > {}

export const Value = <A extends Schema.Top>(inner: A): Value<A> =>
  Schema.declareConstructor<Model.Value<A["Type"]>, ModelValue>()(
    [inner],
    ([valueCodec]) =>
      (component, ast, options) => {
        if (!(component instanceof ModelValue)) {
          return Effect.fail(
            new SchemaIssue.InvalidType(ast, Option.some(component)),
          )
        }
        if (component.tag != null) {
          return Effect.fail(
            new SchemaIssue.InvalidValue(
              Option.some(component),
              meta(
                component,
                `Expected no tag name, got "${component.getTag()}"`,
              ),
            ),
          )
        }
        const value = component.getValue()
        const parser = SchemaParser.decodeUnknownEffect(valueCodec)(
          value,
          options,
        )

        return Effect.mapBothEager(parser, {
          onSuccess: (value) => ({ value, span: span(component) }),
          onFailure: (issue) =>
            new SchemaIssue.InvalidValue(
              Option.some(value),
              meta(component, findMessage(issue)),
            ),
        })
      },
    { kdlComponent: "value" },
  )

export interface ValueTagged<A extends Schema.Top>
  extends Schema.declareConstructor<
    Model.ValueTagged<A["Type"]>,
    ModelValue,
    readonly [A]
  > {}

export const ValueTagged = <A extends Schema.Top>(inner: A): ValueTagged<A> =>
  Schema.declareConstructor<Model.ValueTagged<A["Type"]>, ModelValue>()(
    [inner],
    ([valueCodec]) =>
      (component, ast, options) => {
        if (!(component instanceof ModelValue)) {
          return Effect.fail(
            new SchemaIssue.InvalidType(ast, Option.some(component)),
          )
        }
        const value = component.getValue()
        const tag = component.tag
        const parser = SchemaParser.decodeUnknownEffect(valueCodec)(
          value,
          options,
        )

        return Effect.mapBothEager(parser, {
          onSuccess: (value) => ({
            value,
            span: span(component),
            tagName: tag?.getName(),
            tagSpan: span(tag),
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

function span(component: Model.KdlComponent | null | undefined) {
  if (component == null) return undefined
  const location = getLocation(component)
  if (location === undefined) return undefined
  return SourceSpan.fromStartEnd(location.start.offset, location.end.offset)
}

function meta(component: Model.KdlComponent, message?: string) {
  return {
    message: message ?? "Some unknown error",
    kdlComponent: component,
    kdlSpan: span(component),
  }
}

/*
const Workspace = Kdl.Node("workspace", {
  name: Kdl.EntryArgument(0, String),
  openOnOutput: Kdl.NodeOption("open-on-output", String)
}).pipe(
  // inspired by ParseOptions.onExcessProperty
  Kdl.checkOnExcessChildren("error")
)

const Config = Kdl.Node(({
  worspaces: Kdl.NodeChildren(Workspace)
    .pipe(Kdl.checkUniqueBy((worspace) => worspace.name.value))
}))
*/
