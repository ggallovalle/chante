import { Schema } from "effect"

export const TextEffect = Schema.Literals([
  "bold",
  "dimmed",
  "italic",
  "underline",
  "blink",
  "blinkFast",
  "reversed",
  "hidden",
  "strikethrough",
])
export type TextEffect = Schema.Schema.Type<typeof TextEffect>

export const Color = Schema.TaggedUnion({
  css: { value: Schema.String },
  ansi: { value: Schema.Finite },
  hex: { value: Schema.Finite },
})

export const ansi = (code: number): Color =>
  Color.cases.ansi.makeUnsafe({ value: code })

export const css = (value: string): Color =>
  Color.cases.css.makeUnsafe({ value })

export const hex = (code: number): Color =>
  Color.cases.ansi.makeUnsafe({ value: code })

export type Color = Schema.Schema.Type<typeof Color>

export const colors = {
  red: css("red"),
  green: css("green"),
  yellow: css("yellow"),
}
