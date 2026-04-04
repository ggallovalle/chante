import { Schema } from "effect"
import type { Severity } from "../diagnostic.js"

export class ThemeCharacters extends Schema.Class<ThemeCharacters>(
  "miette/ThemeCharacters",
)({
  hbar: Schema.String,
  vbar: Schema.String,
  xbar: Schema.String,
  vbarBreak: Schema.String,
  uarrow: Schema.String,
  rarrow: Schema.String,
  ltop: Schema.String,
  mtop: Schema.String,
  rtop: Schema.String,
  lbot: Schema.String,
  mbot: Schema.String,
  rbot: Schema.String,
  lbox: Schema.String,
  rbox: Schema.String,
  lcross: Schema.String,
  rcross: Schema.String,
  underbar: Schema.String,
  underline: Schema.String,
  error: Schema.String,
  warning: Schema.String,
  advice: Schema.String,
}) {
  static unicode(): ThemeCharacters {
    return new ThemeCharacters({
      hbar: "─",
      vbar: "│",
      xbar: "┼",
      vbarBreak: "·",
      uarrow: "▲",
      rarrow: "▶",
      ltop: "╭",
      mtop: "┬",
      rtop: "╮",
      lbot: "╰",
      mbot: "┴",
      rbot: "╯",
      lbox: "[",
      rbox: "]",
      lcross: "├",
      rcross: "┤",
      underbar: "┬",
      underline: "─",
      error: "×",
      warning: "⚠",
      advice: "☞",
    })
  }

  static emoji(): ThemeCharacters {
    return new ThemeCharacters({
      hbar: "─",
      vbar: "│",
      xbar: "┼",
      vbarBreak: "·",
      uarrow: "▲",
      rarrow: "▶",
      ltop: "╭",
      mtop: "┬",
      rtop: "╮",
      lbot: "╰",
      mbot: "┴",
      rbot: "╯",
      lbox: "[",
      rbox: "]",
      lcross: "├",
      rcross: "┤",
      underbar: "┬",
      underline: "─",
      error: "💥",
      warning: "⚠",
      advice: "💡",
    })
  }

  static ascii(): ThemeCharacters {
    return new ThemeCharacters({
      hbar: "-",
      vbar: "|",
      xbar: "+",
      vbarBreak: ":",
      uarrow: "^",
      rarrow: ">",
      ltop: ",",
      mtop: "v",
      rtop: ".",
      lbot: "`",
      mbot: "^",
      rbot: "'",
      lbox: "[",
      rbox: "]",
      lcross: "|",
      rcross: "|",
      underbar: "|",
      underline: "^",
      error: "x",
      warning: "!",
      advice: ">",
    })
  }

  diagnostic(severity: Severity): string {
    if (severity === "warning") {
      return this.warning
    }
    if (severity === "advice") {
      return this.advice
    }
    return this.error
  }
}
