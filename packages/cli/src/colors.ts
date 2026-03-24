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
  "strikethrough"
])

export type TextEffect = Schema.Schema.Type<typeof TextEffect>

export const Color = Schema.Union([
  Schema.TaggedStruct("css", { value: Schema.String }),
  Schema.TaggedStruct("ansi", { value: Schema.Finite }),
  Schema.TaggedStruct("hex", { value: Schema.Finite }),
])

export type Color = Schema.Schema.Type<typeof Color>

const EffectBit = {
  dimmed: 0,
  italic: 1,
  underline: 2,
  blink: 3,
  blinkFast: 4,
  reversed: 5,
  hidden: 6,
  strikethrough: 7
} as const

type EffectBitKey = keyof typeof EffectBit

class StyleFlags {
  constructor(private readonly bits: number = 0) { }

  static empty(): StyleFlags {
    return new StyleFlags(0)
  }

  private resolve(effect: TextEffect): number | null {
    const flag = effectToFlag(effect)
    return flag === null ? null : EffectBit[flag]
  }

  has(effect: TextEffect): boolean {
    const shift = this.resolve(effect)
    if (shift === null) return false
    return ((this.bits >> shift) & 1) !== 0
  }

  set(effect: TextEffect, value: boolean): StyleFlags {
    const shift = this.resolve(effect)
    if (shift === null) return this

    const next = value
      ? this.bits | (1 << shift)
      : this.bits & ~(1 << shift)

    return new StyleFlags(next)
  }

  toggle(effect: TextEffect): StyleFlags {
    const shift = this.resolve(effect)
    if (shift === null) return this
    return new StyleFlags(this.bits ^ (1 << shift))
  }

  get value(): number {
    return this.bits
  }
}

function effectToFlag(effect: TextEffect): EffectBitKey | null {
  switch (effect) {
    case "bold":
      return null // handled separately like Rust
    case "dimmed":
      return "dimmed"
    case "italic":
      return "italic"
    case "underline":
      return "underline"
    case "blink":
      return "blink"
    case "blinkFast":
      return "blinkFast"
    case "reversed":
      return "reversed"
    case "hidden":
      return "hidden"
    case "strikethrough":
      return "strikethrough"
  }
}


export class Style extends Schema.Class<Style>("colors/Style")({
  fg: Schema.optional(Color),
  bg: Schema.optional(Color),
  bold: Schema.Boolean,
  flags: Schema.Number // your bitmask
}) {
  static builder() {
    return StyleBuilder.empty()
  }
}

export class Styled extends Schema.Class<Styled>("colors/Styled")({
  style: Style,
  prefix: Schema.String
}) {

  stiled(value: any): string {
    return `${this.prefix}${value}\x1b[0m`
  }
}

function effectToAnsi(effect: TextEffect): string | null {
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
  }
}

function colorToAnsi(color: Color, type: "fg" | "bg"): string | null {
  const ansi = Bun.color(color.value, "ansi")

  if (ansi == null) return null

  if (type === "fg") return ansi

  return ansi.startsWith("\x1b[38;")
    ? "\x1b[48;" + ansi.slice(5)
    : ansi
}

class StyleBuilder {
  private style: Style

  private constructor(style: Style) {
    this.style = style
  }

  static empty(): StyleBuilder {
    return new StyleBuilder(
      new Style({
        fg: undefined,
        bg: undefined,
        bold: false,
        flags: 0
      })
    )
  }

  fg(color: Color): this {
    this.style = new Style({ ...this.style, fg: color })
    return this
  }

  bg(color: Color): this {
    this.style = new Style({ ...this.style, bg: color })
    return this
  }

  effect(effect: TextEffect, value = true): this {
    if (effect === "bold") {
      this.style = new Style({ ...this.style, bold: value })
      return this
    }

    const flags = new StyleFlags(this.style.flags)
      .set(effect, value)
      .value

    this.style = new Style({ ...this.style, flags })
    return this
  }

  buildAnsi(preferColor: boolean = true): Styled {
    let prefix = ""

    // --- colors ---
    if (preferColor) {
      if (this.style.fg) {
        const fg = colorToAnsi(this.style.fg, "fg")
        if (fg) prefix += fg
      }

      if (this.style.bg) {
        const bg = colorToAnsi(this.style.bg, "bg")
        if (bg) prefix += bg
      }
    }

    // --- bold ---
    if (this.style.bold) {
      prefix += "\x1b[1m"
    }

    // --- flags ---
    const flags = new StyleFlags(this.style.flags)

    const effects: TextEffect[] = [
      "dimmed",
      "italic",
      "underline",
      "blink",
      "blinkFast",
      "reversed",
      "hidden",
      "strikethrough"
    ]

    for (const effect of effects) {
      if (flags.has(effect)) {
        const ansi = effectToAnsi(effect)
        if (ansi) prefix += ansi
      }
    }

    return new Styled({ style: this.style, prefix })
  }
}
