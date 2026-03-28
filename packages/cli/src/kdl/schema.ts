import {
  getLocation,
  Node as KdlNode,
  Value as KdlValue,
  parse,
} from "@bgotink/kdl"
import {
  Effect,
  Option as EffectOption,
  Result,
  Schema,
  type SchemaAST,
  SchemaIssue,
  SchemaParser,
} from "effect"

import { SourceSpan } from "~/miette.js"
import type * as Model from "./model.js"

export type ValueConstraint = Schema.Encoder<string | number | boolean | null>
// biome-ignore lint/suspicious/noExplicitAny: I know
export type ValueCodec<T = any> = Schema.Codec<T, KdlValue>
// biome-ignore lint/suspicious/noExplicitAny: I know
export type NodeCodec<T = any> = Schema.Codec<T, KdlNode>
/**
 * Constraint for a struct field map: an object whose values are schemas.
 *
 * @since 4.0.0
 */
export type Children = { readonly [x: PropertyKey]: NodeCodec }

export interface V<A extends Schema.Top>
  extends Schema.declareConstructor<
    Model.Value<A["Type"]>,
    KdlValue,
    readonly [A]
  > {
  readonly value: A
}

export const V = <A extends ValueConstraint>(inner: A): V<A> => {
  const schema = Schema.declareConstructor<Model.Value<A["Type"]>, KdlValue>()(
    [inner],
    ([valueCodec]) =>
      (component, ast, options) => {
        if (!(component instanceof KdlValue)) {
          return Effect.fail(
            new SchemaIssue.InvalidType(ast, EffectOption.some(component)),
          )
        }
        const allowTagged = ast.annotations?.["kdlAllowTag"] === true
        if (!allowTagged && component.tag != null) {
          return Effect.fail(
            new SchemaIssue.InvalidValue(
              EffectOption.some(component),
              meta(
                component,
                `Expected no tag name, got "${component.getTag()}"`,
              ),
            ),
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
          onFailure: (issue) =>
            new SchemaIssue.InvalidValue(
              EffectOption.some(value),
              meta(component, findMessage(issue)),
            ),
        })
      },
    { kdlComponent: "value" },
  )
  return Schema.make(schema.ast, { value: inner })
}

export const allowTagged = <A extends Schema.Top>(self: V<A>): V<A> =>
  self.pipe(Schema.annotate({ kdlAllowTag: true })) as V<A>

export const resolveKdlSpan = (
  schemaOrIssue: Schema.Schema<unknown> | SchemaIssue.Issue,
): SourceSpan | undefined => {
  if ("ast" in schemaOrIssue && "annotations" in schemaOrIssue.ast) {
    return schemaOrIssue.ast.annotations?.["kdlSpan"] as SourceSpan | undefined
  }
  if ("annotations" in schemaOrIssue) {
    return schemaOrIssue.annotations?.["kdlSpan"] as SourceSpan | undefined
  }
  return undefined
}

export interface Arg<I extends ValueCodec>
  extends Schema.declareConstructor<
    Model.EntryArgument<I["Type"]>,
    KdlNode,
    readonly [I]
  > {
  readonly index: number
  readonly data: I
}

export const Arg = <I extends ValueCodec>(index: number, data: I): Arg<I> => {
  const schema = Schema.declareConstructor<
    Model.EntryArgument<I["Type"]>,
    KdlNode
  >()(
    [data],
    ([dataCodec]) =>
      (component, ast, options) => {
        if (!(component instanceof KdlNode)) {
          return Effect.fail(
            new SchemaIssue.InvalidType(ast, EffectOption.some(component)),
          )
        }
        const entry = component.getArgumentEntry(index)
        if (entry == null)
          return Effect.fail(
            new SchemaIssue.InvalidValue(
              EffectOption.some(entry),
              meta(
                component,
                `Expected node "${component.getName()}" to have argument at index ${index}`,
              ),
            ),
          )

        const value = entry.value
        const parser = SchemaParser.decodeUnknownEffect(dataCodec)(
          value,
          options,
        )

        return Effect.mapBothEager(parser, {
          onSuccess: (value) => ({
            data: value,
            index,
          }),
          // <- here
          onFailure: (issue) => {
            // console.log(issue)
            return new SchemaIssue.InvalidValue(
              EffectOption.some(value),
              meta(value, findMessage(issue)),
            )
          },
        })
      },
    { kdlComponent: "node" },
  )
  return Schema.make(schema.ast, { data, index })
}

export interface Prop<I extends ValueCodec>
  extends Schema.declareConstructor<
    Model.EntryProperty<I["Type"]>,
    KdlNode,
    readonly [I]
  > {
  readonly name: string
  readonly data: I
}

export const Prop = <I extends ValueCodec>(name: string, data: I): Prop<I> => {
  const schema = Schema.declareConstructor<
    Model.EntryProperty<I["Type"]>,
    KdlNode
  >()(
    [data],
    ([dataCodec]) =>
      (component, ast, options) => {
        if (!(component instanceof KdlNode)) {
          return Effect.fail(
            new SchemaIssue.InvalidType(ast, EffectOption.some(component)),
          )
        }
        const entry = component.getPropertyEntry(name)
        if (entry == null)
          return Effect.fail(
            new SchemaIssue.InvalidValue(
              EffectOption.some(entry),
              meta(
                component,
                `Expected node "${component.getName()}" to have property "${name}"`,
              ),
            ),
          )

        // biome-ignore lint/style/noNonNullAssertion: I know because is a property
        const identifier = entry.name!
        const value = entry.value
        const parser = SchemaParser.decodeUnknownEffect(dataCodec)(
          value,
          options,
        )

        return Effect.mapBothEager(parser, {
          onSuccess: (value) => ({
            name,
            data: value,
            span: span(entry),
            nameSpan: span(identifier),
          }),
          // <- here
          onFailure: (issue) => {
            // console.log(issue)
            return new SchemaIssue.InvalidValue(
              EffectOption.some(value),
              meta(value, findMessage(issue)),
            )
          },
        })
      },
    { kdlComponent: "node" },
  )
  return Schema.make(schema.ast, { data, name })
}

export interface Opt<I extends ValueCodec>
  extends Schema.declareConstructor<
    Model.Option<I["Type"]>,
    KdlNode,
    readonly [I]
  > {
  readonly name: string
  readonly data: I
}

export const Opt = <I extends ValueCodec>(name: string, data: I): Opt<I> => {
  const schema = Schema.declareConstructor<Model.Option<I["Type"]>, KdlNode>()(
    [data],
    ([dataCodec]) =>
      (component, ast, options) => {
        if (!(component instanceof KdlNode)) {
          return Effect.fail(
            new SchemaIssue.InvalidType(ast, EffectOption.some(component)),
          )
        }

        const child = component.findNodeByName(name)

        let entry: { value: KdlValue; span: SourceSpan | undefined } | null =
          null
        let source: "node" | "property" = "node"
        let nameSpan: SourceSpan | undefined

        if (child != null) {
          const childEntry = child.getArgumentEntry(0)
          if (childEntry != null) {
            entry = {
              value: childEntry.value,
              span: span(childEntry.value),
            }
            nameSpan = span(child.name)
          }
        }

        if (entry == null) {
          const propEntry = component.getPropertyEntry(name)
          if (propEntry != null) {
            entry = {
              value: propEntry.value,
              span: span(propEntry.value),
            }
            nameSpan = span(propEntry.name)
            source = "property"
          }
        }

        if (entry == null) {
          return Effect.fail(
            new SchemaIssue.InvalidValue(
              EffectOption.some(undefined),
              meta(
                component,
                `Expected node "${component.getName()}" to have either a child node named "${name}" or a property "${name}"`,
              ),
            ),
          )
        }

        const parser = SchemaParser.decodeUnknownEffect(dataCodec)(
          entry.value,
          options,
        )

        return Effect.mapBothEager(parser, {
          onSuccess: (value) => ({
            name,
            data: value,
            span: entry?.span,
            nameSpan,
            source,
          }),
          onFailure: (issue) =>
            new SchemaIssue.InvalidValue(
              EffectOption.some(entry?.value),
              meta(entry?.value, findMessage(issue)),
            ),
        })
      },
    { kdlComponent: "node" },
  )
  return Schema.make(schema.ast, { data, name })
}

export interface Node<Fields extends Children>
  extends Schema.declareConstructor<
    Model.Node<Schema.Schema.Type<Schema.Struct<Fields>>>,
    KdlNode,
    readonly [Schema.Struct<Fields>]
  > {
  readonly name: string
  readonly children: Fields
}

export const Node = <const Fields extends Children>(
  name: string,
  children: Fields,
): Node<Fields> => {
  const struct = Schema.Struct(children)
  const schema = Schema.declareConstructor<
    Model.Node<(typeof struct)["Type"]>,
    KdlNode
  >()(
    [struct],
    ([structCodec]) =>
      (component, ast, options) => {
        if (!(component instanceof KdlNode)) {
          return Effect.fail(
            new SchemaIssue.InvalidType(ast, EffectOption.some(component)),
          )
        }

        const componentName = component.getName()
        if (componentName !== name) {
          return Effect.fail(
            new SchemaIssue.InvalidValue(
              EffectOption.some(component),
              meta(
                component.name,
                `Expected node to have name "${name}", got "${componentName}"`,
              ),
            ),
          )
        }

        const inner = Object.keys(children).reduce(
          (acc, key) => {
            acc[key] = component
            return acc
          },
          {} as Record<PropertyKey, KdlNode>,
        )

        const parser = SchemaParser.decodeUnknownEffect(structCodec)(
          inner,
          options,
        )

        return Effect.mapEager(parser, (value) => ({
          name,
          children: value,
          span: span(component),
          nameSpan: span(component.name),
        }))
      },
    { kdlComponent: "node", kdlNodeName: name },
  )

  return Schema.make(schema.ast, { name, children: struct }) as Node<Fields>
}

export const decodeSourceResult = <S extends Schema.Decoder<unknown>>(
  schema: S,
) => {
  const componentType = schema.ast.annotations?.["kdlComponent"]
  if (typeof componentType !== "string") {
    throw new Error(
      "The schema MUST be a KDL component, either 'value', 'node' or 'document'",
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
        new SchemaIssue.InvalidValue(EffectOption.some(source), {
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
const Workspace = KdlSchema.Node("workspace", {
  name: KdlSchema.Arg(0, KdlSchema.V(String)),
  openOnOutput: KdlSchema.Option("open-on-output", KdlSchema.V(String))
}).pipe(
  // inspired by ParseOptions.onExcessProperty
  KdlSchema.checkOnExcessChildren("error")
)

const Config = KdlSchema.Document(({
  worspaces: KdlSchema.NodeChildren(Workspace)
    .pipe(KdlSchema.checkUniqueBy((worspace) => worspace.name.value))
}))
*/
