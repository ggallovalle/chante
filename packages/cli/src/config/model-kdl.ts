import {
  type Document,
  type Entry,
  getLocation,
  type Identifier,
  type Node,
  type Tag,
  Value,
} from "@bgotink/kdl"
import { Effect, Option, Schema, SchemaGetter, SchemaIssue } from "effect"

export type Component = Value | Identifier | Tag | Entry | Node | Document

export const KdlPrimitive = Schema.Union([
  Schema.String,
  Schema.Number,
  Schema.Boolean,
  Schema.Null,
])

function meta(component: Component, message: string) {
  return {
    message: message,
    kdlComponent: component,
    kdlLocation: getLocation(component),
  }
}

export const KdlValue = Schema.instanceOf(Value, {
  toCodecJson: () =>
    Schema.link<Value>()(
      Schema.Struct({
        value: KdlPrimitive,
        tag: Schema.NullOr(Schema.String),
      }),
      {
        decode: SchemaGetter.transform((value) => {
          const kdl = new Value(value.value)
          kdl.setTag(value.tag)
          return kdl
        }),
        encode: SchemaGetter.transform((value) => ({
          value: value.getValue(),
          tag: value.getTag(),
        })),
      },
    ),
})

export const KdlNumber = Schema.instanceOf(Value, {
  toCodecJson: () =>
    Schema.link<Value>()(
      Schema.Struct({
        value: Schema.Number,
        tag: Schema.NullOr(Schema.String),
      }),
      {
        decode: SchemaGetter.transform((value) => {
          const kdl = new Value(value.value)
          kdl.setTag(value.tag)
          return kdl
        }),
        encode: SchemaGetter.transformOrFail((component) => {
          const value = component.getValue()
          if (typeof value !== "number") {
            const typeName = value === null ? "null" : typeof value
            return Effect.fail(
              new SchemaIssue.InvalidValue(
                Option.some(value),
                meta(component, `Expected number, got ${typeName}`),
              ),
            )
          }
          return Effect.succeed({
            value,
            tag: component.getTag(),
          })
        }),
      },
    ),
})

export const KdlBoolean = Schema.instanceOf(Value, {
  toCodecJson: () =>
    Schema.link<Value>()(
      Schema.Struct({
        value: Schema.Boolean,
        tag: Schema.NullOr(Schema.String),
      }),
      {
        decode: SchemaGetter.transform((value) => {
          const kdl = new Value(value.value)
          kdl.setTag(value.tag)
          return kdl
        }),
        encode: SchemaGetter.transformOrFail((component) => {
          const value = component.getValue()
          if (typeof value !== "boolean") {
            const typeName = value === null ? "null" : typeof value
            return Effect.fail(
              new SchemaIssue.InvalidValue(
                Option.some(value),
                meta(component, `Expected boolean, got ${typeName}`),
              ),
            )
          }
          return Effect.succeed({
            value,
            tag: component.getTag(),
          })
        }),
      },
    ),
})

export const KdlString = Schema.instanceOf(Value, {
  toCodecJson: () =>
    Schema.link<Value>()(
      Schema.Struct({
        value: Schema.String,
        tag: Schema.NullOr(Schema.String),
      }),
      {
        decode: SchemaGetter.transform((value) => {
          const kdl = new Value(value.value)
          kdl.setTag(value.tag)
          return kdl
        }),
        encode: SchemaGetter.transformOrFail((component) => {
          const value = component.getValue()
          if (typeof value !== "string") {
            const typeName = value === null ? "null" : typeof value
            return Effect.fail(
              new SchemaIssue.InvalidValue(
                Option.some(value),
                meta(component, `Expected string, got ${typeName}`),
              ),
            )
          }
          return Effect.succeed({
            value,
            tag: component.getTag(),
          })
        }),
      },
    ),
})
