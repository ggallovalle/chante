import nodeUtil from "node:util"
import { Effect, Layer } from "effect"
import { effectToAnsi } from "./ansi.js"
import { type Color, type IStyler, type Style, Styler } from "./index.js"

export class AnsiNodeStyler implements IStyler {
  styled(style: Style): (value: unknown) => string {
    const formats: string[] = []

    if (style.fg) {
      const format = colorToFormat(style.fg, "fg")
      if (format) formats.push(format)
    }

    if (style.bg) {
      const format = colorToFormat(style.bg, "bg")
      if (format) formats.push(format)
    }

    if (style.bold) {
      formats.push("bold")
    }

    for (const effect of style.effects ?? []) {
      const ansi = effectToAnsi(effect)
      if (ansi) formats.push(effect)
    }

    return formats.length > 0
      ? (value) => nodeUtil.styleText(formats as never, `${value}`)
      : (value) => `${value}`
  }
}

export const AnsiNodeStylerLayer = Layer.effect(
  Styler,
  Effect.sync(() => new AnsiNodeStyler()),
)

export function colorToFormat(color: Color, type: "fg" | "bg"): string | null {
  if (color._tag === "css") {
    const colorName = color.value
    if (type === "fg") return colorName
    return `bg${colorName[0]?.toUpperCase()}${colorName.slice(1)}`
  }

  return null
}
