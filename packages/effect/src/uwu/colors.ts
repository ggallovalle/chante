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
  black: css("black"), // ansi 30
  red: css("red"), // ansi 31
  green: css("green"), // ansi 32
  yellow: css("yellow"), // ansi 33
  blue: css("blue"), // ansi 34
  magenta: css("magenta"), // ansi 35
  cyan: css("cyan"), // ansi 36
  white: css("white"), // ansi 37
}
