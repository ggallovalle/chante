import { Effect, Layer, Match, Schema, ServiceMap } from "effect"
import { getRuntime } from "~/internal/detect-runtime.js"

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
  success(value: unknown): string
  error(value: unknown): string
  warning(value: unknown): string
}

export class Colorizer extends ServiceMap.Service<Colorizer, IColorizer>()(
  "@kbroom/effect/uwu/Colorizer",
) {}

export class DefaultColorizer implements IColorizer {
  styled: {
    red: (value: unknown) => string
    green: (value: unknown) => string
    yellow: (value: unknown) => string
  }

  constructor(styler: IStyler) {
    this.styled = {
      red: styler.styled(new Style({ fg: colors.red })),
      green: styler.styled(new Style({ fg: colors.green })),
      yellow: styler.styled(new Style({ fg: colors.yellow })),
    }
  }
  success(value: unknown): string {
    return this.styled.green(value)
  }
  error(value: unknown): string {
    return this.styled.red(value)
  }
  warning(value: unknown): string {
    return this.styled.yellow(value)
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
