import { HashSet, Schema } from "effect"
import { isColorEnabled, isTty } from "~/internal/detect-runtime.js"
import type { Severity } from "~/miette/diagnostic.js"
import { ansi, type IStyler, Style } from "~/uwu/index.js"

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
  error: Style,
  warning: Style,
  advice: Style,
  help: Style,
  link: Style,
  linum: Style,
  highlights: Schema.Array(Style),
}) {
  static ansi(): ThemeStyles {
    return new ThemeStyles({
      error: new Style({
        fg: ansi(31),
        bg: undefined,
        bold: false,
        effects: HashSet.empty(),
      }),
      warning: new Style({
        fg: ansi(33),
        bg: undefined,
        bold: false,
        effects: HashSet.empty(),
      }),
      advice: new Style({
        fg: ansi(36),
        bg: undefined,
        bold: false,
        effects: HashSet.empty(),
      }),
      help: new Style({
        fg: ansi(36),
        bg: undefined,
        bold: false,
        effects: HashSet.empty(),
      }),
      link: new Style({
        fg: ansi(36),
        bg: undefined,
        bold: true,
        effects: HashSet.fromIterable(["underline"] as const),
      }),
      linum: new Style({
        fg: undefined,
        bg: undefined,
        bold: false,
        effects: HashSet.fromIterable(["dimmed"] as const),
      }),
      highlights: [
        new Style({
          fg: ansi(35),
          bg: undefined,
          bold: true,
          effects: HashSet.empty(),
        }),
        new Style({
          fg: ansi(33),
          bg: undefined,
          bold: true,
          effects: HashSet.empty(),
        }),
        new Style({
          fg: ansi(32),
          bg: undefined,
          bold: true,
          effects: HashSet.empty(),
        }),
      ],
    })
  }

  static none(): ThemeStyles {
    const plain = new Style({
      fg: undefined,
      bg: undefined,
      bold: false,
      effects: HashSet.empty(),
    })

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

  buildColorer(styler: IStyler) {
    return {
      error: styler.styled(this.error),
      warning: styler.styled(this.warning),
      advice: styler.styled(this.advice),
      help: styler.styled(this.help),
      link: styler.styled(this.link),
      linum: styler.styled(this.linum),
      highlights: this.highlights.map((s) => styler.styled(s)),
      pickFromSeverity(severity: Severity) {
        switch (severity) {
          case "warning":
            return this.warning
          case "advice":
            return this.advice
          default:
            return this.error
        }
      },
    }
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
    if (!isTty()) return GraphicalTheme.none()
    if (!isColorEnabled()) return GraphicalTheme.unicodeNoColor()
    return GraphicalTheme.unicode()
  }
}
