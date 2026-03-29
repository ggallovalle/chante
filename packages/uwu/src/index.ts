import { Effect, Layer, Schema, ServiceMap } from "effect"

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

export class Style extends Schema.Class<Style>("uwu/Style")({
  fg: Schema.optional(Color),
  bg: Schema.optional(Color),
  bold: Schema.Boolean,
  effects: Schema.HashSet(TextEffect),
}) {}

export class Styled extends Schema.Class<Styled>("uwu/Styled")({
  style: Style,
  prefix: Schema.String,
  sufix: Schema.String,
}) {
  stiled(value: unknown): string {
    return `${this.prefix}${String(value)}${this.sufix}`
  }
}

export interface IStyler {
  styled(style: Style): Styled
}

export class Styler extends ServiceMap.Service<Styler, IStyler>()(
  "@kbroom/uwu/Styler",
) {}

export class NoopStyler implements IStyler {
  styled(style: Style): Styled {
    return new Styled({
      prefix: "",
      style,
      sufix: "",
    })
  }
}

export const NooopStylerLayer = Layer.effect(
  Styler,
  Effect.sync(() => new NoopStyler()),
)

export class AnsiBunStyler implements IStyler {
  styled(style: Style): Styled {
    let prefix = ""

    if (style.fg) {
      const fg = colorToAnsi(style.fg, "fg")
      if (fg) prefix += fg
    }

    if (style.bg) {
      const bg = colorToAnsi(style.bg, "bg")
      if (bg) prefix += bg
    }

    if (style.bold) {
      prefix += "\x1b[1m"
    }

    for (const effect of style.effects) {
      const ansi = effectToAnsi(effect)
      if (ansi) prefix += ansi
    }

    const sufix = prefix === "" ? "" : "\x1b[0m"

    return new Styled({ style, prefix, sufix })
  }
}

function effectToAnsi(effect: string): string | null {
  switch (effect) {
    case "bold":
      return "\x1b[1m"
    case "dimmed":
      return "\x1b[2m"
    case "italic":
      return "\x1b[3m"
    case "underline":
      return "\x1b[4m"
    case "blink":
      return "\x1b[5m"
    case "blinkFast":
      return "\x1b[6m"
    case "reversed":
      return "\x1b[7m"
    case "hidden":
      return "\x1b[8m"
    case "strikethrough":
      return "\x1b[9m"
    default:
      return null
  }
}

function colorToAnsi(color: Color, type: "fg" | "bg"): string | null {
  const ansi = Bun.color(color.value as string, "ansi")

  if (ansi == null) return null

  if (type === "fg") return ansi

  return ansi.startsWith("\x1b[38;") ? `\x1b[48;${ansi.slice(5)}` : ansi
}
