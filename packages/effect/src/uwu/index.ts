import { Effect, HashSet, Layer, Match, Schema, ServiceMap } from "effect"
import { getRuntime } from "~/internal/detect-runtime.js"
import type { Severity } from "~/miette/diagnostic.js"
import { Color, colors, TextEffect } from "./colors.js"

export { ansi, Color, colors, css, hex, TextEffect } from "./colors.js"

export class Style extends Schema.Class<Style>("@kbroom/effect/uwu/Style")({
  fg: Schema.optional(Color),
  bg: Schema.optional(Color),
  bold: Schema.optional(Schema.Boolean),
  effects: Schema.optional(Schema.HashSet(TextEffect)),
}) {}

export interface IStyler {
  styled(style: Style): (value: unknown) => string
}

export class Styler extends ServiceMap.Service<Styler, IStyler>()(
  "@kbroom/effect/uwu/Styler",
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
  "@kbroom/effect/uwu/Colorizer",
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
      const runtime = getRuntime()
      const styler = yield* Match.value(runtime).pipe(
        Match.when("node", () =>
          Effect.promise(() =>
            import("./node.js").then((m) => new m.AnsiNodeStyler() as IStyler),
          ),
        ),
        Match.when("bun", () =>
          Effect.promise(() =>
            import("./bun.js").then((m) => new m.AnsiBunStyler() as IStyler),
          ),
        ),
        Match.orElse(() => Effect.succeed(new NoopStyler())),
      )

      const colorizer = yield* factory(styler)

      return ServiceMap.makeUnsafe<IColorizer | IStyler>(
        new Map([
          [Styler.key, styler],
          [Colorizer.key, colorizer],
          // biome-ignore lint/suspicious/noExplicitAny: I Know
        ] as any),
      )
    }),
  )
}

export const layer = layerWith((styler) =>
  Effect.succeed(new DefaultColorizer(styler)),
)
