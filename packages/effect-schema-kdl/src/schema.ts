import {
  Document as KdlDocument,
  Node as KdlNode,
  Value as KdlValue,
} from "@bgotink/kdl"
import type { SourceSpan } from "@kbroom/effect-schema-miette"
import {
  Effect,
  Option as EffectOption,
  Schema,
  SchemaIssue,
  SchemaParser,
} from "effect"
import * as D from "~/diagnostic.js"
import { span } from "~/diagnostic.js"
import { decodeSourceResult } from "~/parser.js"
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
          return Effect.fail(D.tagNotAllowed(component.tag))
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
          onFailure: (issue) => D.invalidValue(component, issue),
        })
      },
    { kdlComponent: "value" },
  )
  return Schema.make(schema.ast, { value: inner })
}

export const allowTagged = <A extends ValueCodec>(self: A): A =>
  self.pipe(Schema.annotate({ kdlAllowTag: true })) as A

export const optional = <I extends NodeCodec>(
  self: I,
): NodeCodec<Schema.Schema.Type<I> | undefined> => {
  // biome-ignore lint/suspicious/noExplicitAny: I know
  return self.pipe(Schema.annotate({ kdlOptional: true })) as any
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
        if (entry == null) {
          const isOptional = ast.annotations?.["kdlOptional"] === true
          if (isOptional) {
            // biome-ignore lint/suspicious/noExplicitAny: I know
            return Effect.void as any
          }
          return Effect.fail(D.nodeRequiresArgument(component, index))
        }

        const value = entry.value
        const parser = SchemaParser.decodeUnknownEffect(dataCodec)(
          value,
          options,
        )

        return Effect.map(parser, (value) => ({
          data: value,
          index,
        }))
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
        if (entry == null) {
          const isOptional = ast.annotations?.["kdlOptional"] === true
          if (isOptional) {
            // biome-ignore lint/suspicious/noExplicitAny: I know
            return Effect.void as any
          }
          return Effect.fail(D.nodeRequiresProperty(component, name))
        }

        // biome-ignore lint/style/noNonNullAssertion: I know because is a property
        const identifier = entry.name!
        const value = entry.value
        const parser = SchemaParser.decodeUnknownEffect(dataCodec)(
          value,
          options,
        )

        return Effect.mapEager(parser, (value) => ({
          name,
          data: value,
          span: span(entry),
          nameSpan: span(identifier),
        }))
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
        if (
          !(component instanceof KdlNode || component instanceof KdlDocument)
        ) {
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

        if (component instanceof KdlDocument && entry == null) {
          return Effect.fail(D.optRequiresArgument(component, name, 0))
        }
        const node = component as KdlNode

        if (entry == null) {
          const propEntry = node.getPropertyEntry(name)
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
          const isOptional = ast.annotations?.["kdlOptional"] === true
          if (isOptional) {
            // biome-ignore lint/suspicious/noExplicitAny: I know
            return Effect.void as any
          }
          return Effect.fail(D.optRequiresProperty(node, name))
        }

        const parser = SchemaParser.decodeUnknownEffect(dataCodec)(
          entry.value,
          options,
        )

        return Effect.mapEager(parser, (value) => ({
          name,
          data: value,
          span: entry?.span,
          nameSpan,
          source,
        }))
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
        let node: KdlNode
        if (component instanceof KdlDocument) {
          const found = component.findNodeByName(name)
          if (found === undefined) {
            const isOptional = ast.annotations?.["kdlOptional"] === true
            if (isOptional) {
              const isOptional = ast.annotations?.["kdlOptional"] === true
              if (isOptional) {
                // biome-ignore lint/suspicious/noExplicitAny: I know
                return Effect.void as any
              }
            }
            return Effect.fail(D.documentRequiresNode(component, name))
          }
          node = found
        } else if (component instanceof KdlNode) {
          node = component
        } else {
          return Effect.fail(
            new SchemaIssue.InvalidType(ast, EffectOption.some(component)),
          )
        }

        const componentName = node.getName()
        if (componentName !== name) {
          return Effect.fail(D.nodeNameMismatch(node, name, componentName))
        }

        const inner = Object.keys(children).reduce(
          (acc, key) => {
            acc[key] = node
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
          span: span(node),
          nameSpan: span(node.name),
        }))
      },
    { kdlComponent: "node", kdlNodeName: name },
  )

  return Schema.make(schema.ast, { name, children: struct }) as Node<Fields>
}

export interface Document<Fields extends Children>
  extends Schema.declareConstructor<
    Schema.Schema.Type<Schema.Struct<Fields>>,
    KdlDocument,
    readonly [Schema.Struct<Fields>]
  > {
  readonly fields: Fields
}

export const Document = <const Fields extends Children>(
  fields: Fields,
): Document<Fields> => {
  const struct = Schema.Struct(fields)
  const schema = Schema.declareConstructor<
    Schema.Schema.Type<typeof struct>,
    KdlDocument
  >()(
    [struct],
    ([structCodec]) =>
      (component, ast, options) => {
        if (!(component instanceof KdlDocument)) {
          return Effect.fail(
            new SchemaIssue.InvalidType(ast, EffectOption.some(component)),
          )
        }

        const inner = Object.keys(fields).reduce(
          (acc, key) => {
            acc[key] = component
            return acc
          },
          {} as Record<PropertyKey, KdlDocument>,
        )

        const parser = SchemaParser.decodeUnknownEffect(structCodec)(
          inner,
          options,
        )

        return parser
      },
    { kdlComponent: "document" },
  )

  return Schema.make(schema.ast, { fields }) as Document<Fields>
}

// biome-ignore lint/suspicious/noExplicitAny: I know
export interface Many<Items extends Node<any>>
  extends Schema.declareConstructor<
    Array<Items["Type"]>,
    KdlNode,
    readonly [Items]
  > {
  readonly node: Items
}

// biome-ignore lint/suspicious/noExplicitAny: I know
export const Many = <const Items extends Node<any>>(
  node: Items,
): Many<Items> => {
  const nodeName = node.name

  const schema = Schema.declareConstructor<
    Schema.Schema.Type<Items["children"][]>,
    KdlNode | KdlDocument
  >()(
    [Schema.Array(node)],
    ([arrayCodec]) =>
      (component, ast, options) => {
        if (
          !(component instanceof KdlNode || component instanceof KdlDocument)
        ) {
          return Effect.fail(
            new SchemaIssue.InvalidType(ast, EffectOption.some(component)),
          )
        }

        const children = component.findNodesByName(nodeName)

        const parser = SchemaParser.decodeUnknownEffect(arrayCodec)(
          children,
          options,
        )

        // biome-ignore lint/suspicious/noExplicitAny: I Know
        return parser as any
      },
    { kdlComponent: "document", kdlNodeName: node.name },
  )

  return Schema.make(schema.ast, { node }) as Many<Items>
}

export { decodeSourceResult }

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
