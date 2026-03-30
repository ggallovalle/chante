import { Effect, Layer, Schema, ServiceMap } from "effect"
import * as colors from "./colors.js"

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

export class Style extends Schema.Class<Style>("@kbroom/effect/uwu/Style")({
  fg: Schema.optional(Color),
  bg: Schema.optional(Color),
  bold: Schema.optional(Schema.Boolean),
  effects: Schema.optional(Schema.HashSet(TextEffect)),
}) {}

export class Styled extends Schema.Class<Styled>("@kbroom/effect/uwu/Styled")({
  style: Style,
  prefix: Schema.String,
  sufix: Schema.String,
}) {
  stiled(value: unknown): string {
    return `${this.prefix}${String(value)}${this.sufix}`
  }
}

export interface IStyler {
  styled(style: Style): Styled
}

export class Styler extends ServiceMap.Service<Styler, IStyler>()(
  "@kbroom/effect/uwu/Styler",
) {}

export class NoopStyler implements IStyler {
  styled(style: Style): Styled {
    return new Styled({
      prefix: "",
      style,
      sufix: "",
    })
  }
}

export const NooopStylerLayer = Layer.effect(
  Styler,
  Effect.sync(() => new NoopStyler()),
)

export interface IColorizer {
  success(value: unknown): string
  error(value: unknown): string
  warning(value: unknown): string

  red(value: unknown): string
  green(value: unknown): string
  yellow(value: unknown): string
}

export class Colorizer extends ServiceMap.Service<Colorizer, IColorizer>()(
  "@kbroom/effect/uwu/Colorizer",
) {}

export class DefaultColorizer implements IColorizer {
  styled: { red: Styled; green: Styled; yellow: Styled }

  constructor(styler: IStyler) {
    this.styled = {
      red: styler.styled(new Style({ fg: colors.red })),
      green: styler.styled(new Style({ fg: colors.green })),
      yellow: styler.styled(new Style({ fg: colors.yellow })),
    }
  }
  success(value: unknown): string {
    return this.styled.green.stiled(value)
  }
  error(value: unknown): string {
    return this.styled.red.stiled(value)
  }
  warning(value: unknown): string {
    return this.styled.yellow.stiled(value)
  }
  red(value: unknown): string {
    return this.styled.red.stiled(value)
  }
  green(value: unknown): string {
    return this.styled.green.stiled(value)
  }
  yellow(value: unknown): string {
    return this.styled.yellow.stiled(value)
  }
}

export const ColorizerDefaultLayer = Layer.effect(
  Colorizer,
  Effect.gen(function* () {
    const styler = yield* Styler
    return new DefaultColorizer(styler)
  }),
)

export * as colors from "./colors.js"
