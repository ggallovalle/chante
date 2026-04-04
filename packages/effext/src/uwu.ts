import {
  Config,
  Effect,
  HashSet,
  Layer,
  Match,
  Schema,
  ServiceMap,
  Stdio,
} from "effect"
import { getRuntime } from "~/internal/detect-runtime.js"
import type { Severity } from "~/miette.js"

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

export class Style extends Schema.Class<Style>("@kbroom/effext/uwu/Style")({
  fg: Schema.optional(Color),
  bg: Schema.optional(Color),
  bold: Schema.optional(Schema.Boolean),
  effects: Schema.optional(Schema.HashSet(TextEffect)),
}) {}

export interface ITerminalColors {
  readonly isTTY: boolean
  readonly useColors: boolean
}

export class TerminalColors extends ServiceMap.Service<
  TerminalColors,
  ITerminalColors
>()("@kbroom/effext/uwu/TerminalColors") {
  public static service = Effect.gen(function* () {
    const stdio = yield* Stdio.Stdio
    const noColor = yield* Config.boolean("NO_COLOR").pipe(
      Config.withDefault(false),
    )
    const forceColor = yield* Config.boolean("FORCE_COLOR").pipe(
      Config.withDefault(false),
    )
    const argv = yield* stdio.args

    const hasColorFlag = argv.includes("--color")
    const hasNoColorFlag = argv.includes("--no-color")

    const isTTY = Boolean(globalThis.process?.stdout?.isTTY)
    let useColors: boolean

    // Priority order
    if (hasNoColorFlag) {
      useColors = false
    } else if (hasColorFlag) {
      useColors = true
    } else if (noColor) {
      useColors = false
    } else if (forceColor) {
      useColors = true
    } else {
      useColors = isTTY
    }

    return TerminalColors.of({
      isTTY,
      useColors,
    })
  })
}

export interface IStyler {
  styled(style: Style): (value: unknown) => string
}

export class Styler extends ServiceMap.Service<Styler, IStyler>()(
  "@kbroom/effext/uwu/Styler",
) {}

export class NoopStyler implements IStyler {
  styled(_style: Style): (value: unknown) => string {
    return (value) => `${value}`
  }
}

export interface IColorizer {
  diagnostic(severity: Severity, value: unknown): string
  success(value: unknown): string
  error(value: unknown): string
  warning(value: unknown): string
  help(value: unknown): string
  link(value: unknown): string
  lineNumber(value: unknown): string
}

export class Colorizer extends ServiceMap.Service<Colorizer, IColorizer>()(
  "@kbroom/effext/uwu/Colorizer",
) {}

export class DefaultColorizer implements IColorizer {
  success: (value: unknown) => string
  error: (value: unknown) => string
  warning: (value: unknown) => string
  help: (value: unknown) => string
  link: (value: unknown) => string
  lineNumber: (value: unknown) => string

  constructor(styler: IStyler) {
    this.success = styler.styled(new Style({ fg: colors.green }))
    this.error = styler.styled(new Style({ fg: colors.red }))
    this.warning = styler.styled(new Style({ fg: colors.yellow }))
    this.help = styler.styled(new Style({ fg: colors.cyan }))
    this.link = styler.styled(
      new Style({
        fg: colors.cyan,
        bold: true,
        effects: HashSet.fromIterable(["underline"] as const),
      }),
    )
    this.lineNumber = styler.styled(
      new Style({
        effects: HashSet.fromIterable(["dimmed"] as const),
      }),
    )
    // highlights: [
    //   new Style({
    //     fg: colors.magenta,
    //     bold: true,
    //   }),
    //   new Style({
    //     fg: colors.yellow,
    //     bold: true,
    //   }),
    //   new Style({
    //     fg: colors.green,
    //     bold: true,
    //   }),
    // ],
  }
  diagnostic(severity: Severity, value: unknown): string {
    if (severity === "warning") {
      return this.warning(value)
    }
    if (severity === "advice") {
      return this.help(value)
    }
    return this.error(value)
  }
}

export class NoopColorizer implements IColorizer {
  diagnostic(_severity: Severity, value: unknown): string {
    return `${value}`
  }
  success(value: unknown): string {
    return `${value}`
  }
  error(value: unknown): string {
    return `${value}`
  }
  warning(value: unknown): string {
    return `${value}`
  }
  help(value: unknown): string {
    return `${value}`
  }
  link(value: unknown): string {
    return `${value}`
  }
  lineNumber(value: unknown): string {
    return `${value}`
  }
}

export const layerWith = (
  factory: (styler: IStyler) => Effect.Effect<IColorizer>,
) => {
  return Layer.effectServices(
    Effect.gen(function* () {
      const colors = yield* TerminalColors.service
      const runtime = getRuntime()
      const styler = yield* colors.useColors
        ? Match.value(runtime).pipe(
            Match.when("node", () =>
              Effect.promise(() =>
                import("./uwu/node.js").then(
                  (m) => new m.AnsiNodeStyler() as IStyler,
                ),
              ),
            ),
            Match.when("bun", () =>
              Effect.promise(() =>
                import("./uwu/bun.js").then(
                  (m) => new m.AnsiBunStyler() as IStyler,
                ),
              ),
            ),
            Match.orElse(() => Effect.succeed(new NoopStyler())),
          )
        : Effect.succeed(new NoopStyler())

      const colorizer = yield* factory(styler)

      return ServiceMap.makeUnsafe<IColorizer | IStyler | ITerminalColors>(
        new Map([
          [Styler.key, styler],
          [Colorizer.key, colorizer],
          [TerminalColors.key, colors],
          // biome-ignore lint/suspicious/noExplicitAny: I Know
        ] as any),
      )
    }),
  )
}

export const layer = layerWith((styler) =>
  Effect.succeed(new DefaultColorizer(styler)),
)
