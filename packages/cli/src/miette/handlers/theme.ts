import { Schema } from "effect"
import { type Color, Style, Styled } from "~/colors.js"

const ansi = (code: number): Color => ({ _tag: "ansi", value: code }) as Color

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
}

export class ThemeStyles extends Schema.Class<ThemeStyles>(
  "miette/ThemeStyles",
)({
  error: Styled,
  warning: Styled,
  advice: Styled,
  help: Styled,
  link: Styled,
  linum: Styled,
  highlights: Schema.Array(Styled),
}) {
  static ansi(): ThemeStyles {
    return new ThemeStyles({
      error: Style.builder().fg(ansi(31)).buildAnsi(),
      warning: Style.builder().fg(ansi(33)).buildAnsi(),
      advice: Style.builder().fg(ansi(36)).buildAnsi(),
      help: Style.builder().fg(ansi(36)).buildAnsi(),
      link: Style.builder()
        .fg(ansi(36))
        .effect("underline")
        .effect("bold")
        .buildAnsi(),
      linum: Style.builder().effect("dimmed").buildAnsi(),
      highlights: [
        Style.builder().fg(ansi(35)).effect("bold").buildAnsi(),
        Style.builder().fg(ansi(33)).effect("bold").buildAnsi(),
        Style.builder().fg(ansi(32)).effect("bold").buildAnsi(),
      ],
    })
  }

  static none(): ThemeStyles {
    const plain = Style.builder().buildAnsi()
    return new ThemeStyles({
      error: plain,
      warning: plain,
      advice: plain,
      help: plain,
      link: plain,
      linum: plain,
      highlights: [plain],
    })
  }
}

export class GraphicalTheme extends Schema.Class<GraphicalTheme>(
  "miette/GraphicalTheme",
)({
  characters: ThemeCharacters,
  styles: ThemeStyles,
}) {
  static ascii(): GraphicalTheme {
    return new GraphicalTheme({
      characters: ThemeCharacters.ascii(),
      styles: ThemeStyles.ansi(),
    })
  }

  static unicode(): GraphicalTheme {
    return new GraphicalTheme({
      characters: ThemeCharacters.unicode(),
      styles: ThemeStyles.ansi(),
    })
  }

  static unicodeNoColor(): GraphicalTheme {
    return new GraphicalTheme({
      characters: ThemeCharacters.unicode(),
      styles: ThemeStyles.none(),
    })
  }

  static none(): GraphicalTheme {
    return new GraphicalTheme({
      characters: ThemeCharacters.ascii(),
      styles: ThemeStyles.none(),
    })
  }

  static emoji(): GraphicalTheme {
    return new GraphicalTheme({
      characters: ThemeCharacters.emoji(),
      styles: ThemeStyles.ansi(),
    })
  }

  static default(): GraphicalTheme {
    const noColor = process.env["NO_COLOR"]
    const isTty = Boolean(process.stdout?.isTTY && process.stderr?.isTTY)

    if (!isTty) return GraphicalTheme.none()
    if (noColor && noColor !== "0") return GraphicalTheme.unicodeNoColor()
    return GraphicalTheme.unicode()
  }
}
