import { HashSet, Schema } from "effect"
import { ansi, type IStyler, Style, Styled } from "../colors.js"

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
  static ansi(styler: IStyler): ThemeStyles {
    return new ThemeStyles({
      error: styler.styled(
        new Style({
          fg: ansi(31),
          bg: undefined,
          bold: false,
          effects: HashSet.empty(),
        }),
      ),
      warning: styler.styled(
        new Style({
          fg: ansi(33),
          bg: undefined,
          bold: false,
          effects: HashSet.empty(),
        }),
      ),
      advice: styler.styled(
        new Style({
          fg: ansi(36),
          bg: undefined,
          bold: false,
          effects: HashSet.empty(),
        }),
      ),
      help: styler.styled(
        new Style({
          fg: ansi(36),
          bg: undefined,
          bold: false,
          effects: HashSet.empty(),
        }),
      ),
      link: styler.styled(
        new Style({
          fg: ansi(36),
          bg: undefined,
          bold: true,
          effects: HashSet.fromIterable(["underline"] as const),
        }),
      ),
      linum: styler.styled(
        new Style({
          fg: undefined,
          bg: undefined,
          bold: false,
          effects: HashSet.fromIterable(["dimmed"] as const),
        }),
      ),
      highlights: [
        styler.styled(
          new Style({
            fg: ansi(35),
            bg: undefined,
            bold: true,
            effects: HashSet.empty(),
          }),
        ),
        styler.styled(
          new Style({
            fg: ansi(33),
            bg: undefined,
            bold: true,
            effects: HashSet.empty(),
          }),
        ),
        styler.styled(
          new Style({
            fg: ansi(32),
            bg: undefined,
            bold: true,
            effects: HashSet.empty(),
          }),
        ),
      ],
    })
  }

  static none(styler: IStyler): ThemeStyles {
    const plain = styler.styled(
      new Style({
        fg: undefined,
        bg: undefined,
        bold: false,
        effects: HashSet.empty(),
      }),
    )
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
  static ascii(styler: IStyler): GraphicalTheme {
    return new GraphicalTheme({
      characters: ThemeCharacters.ascii(),
      styles: ThemeStyles.ansi(styler),
    })
  }

  static unicode(styler: IStyler): GraphicalTheme {
    return new GraphicalTheme({
      characters: ThemeCharacters.unicode(),
      styles: ThemeStyles.ansi(styler),
    })
  }

  static unicodeNoColor(styler: IStyler): GraphicalTheme {
    return new GraphicalTheme({
      characters: ThemeCharacters.unicode(),
      styles: ThemeStyles.none(styler),
    })
  }

  static none(styler: IStyler): GraphicalTheme {
    return new GraphicalTheme({
      characters: ThemeCharacters.ascii(),
      styles: ThemeStyles.none(styler),
    })
  }

  static emoji(styler: IStyler): GraphicalTheme {
    return new GraphicalTheme({
      characters: ThemeCharacters.emoji(),
      styles: ThemeStyles.ansi(styler),
    })
  }

  static default(styler: IStyler): GraphicalTheme {
    const noColor = process.env["NO_COLOR"]
    const isTty = Boolean(process.stdout?.isTTY && process.stderr?.isTTY)

    if (!isTty) return GraphicalTheme.none(styler)
    if (noColor && noColor !== "0") return GraphicalTheme.unicodeNoColor(styler)
    return GraphicalTheme.unicode(styler)
  }
}
