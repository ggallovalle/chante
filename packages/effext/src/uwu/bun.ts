import { Effect, Layer } from "effect"
import { type Color, type IStyler, type Style, Styler } from "~/uwu.js"
import { effectToAnsi } from "./ansi.js"

export class AnsiBunStyler implements IStyler {
  styled(style: Style): (value: unknown) => string {
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

    for (const effect of style.effects ?? []) {
      const ansi = effectToAnsi(effect)
      if (ansi) prefix += ansi
    }

    const sufix = prefix === "" ? "" : "\x1b[0m"

    return (value) => `${prefix}${value}${sufix}`
  }
}

export const layer = Layer.effect(
  Styler,
  Effect.sync(() => new AnsiBunStyler()),
)

function colorToAnsi(color: Color, type: "fg" | "bg"): string | null {
  const ansi = Bun.color(color.value as string, "ansi")

  if (ansi == null) return null

  if (type === "fg") return ansi

  return ansi.startsWith("\x1b[38;") ? `\x1b[48;${ansi.slice(5)}` : ansi
}
