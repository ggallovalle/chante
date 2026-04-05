import { Effect, Layer, ServiceMap } from "effect"

export interface IHighlighter {
  highlight(source: string, language?: string): Effect.Effect<string>
}

export class Highlighter extends ServiceMap.Service<
  Highlighter,
  IHighlighter
>()("@kbroom/effext/miette/Highlighter") {}

export class NoopHighlighter implements IHighlighter {
  highlight(source: string): Effect.Effect<string> {
    return Effect.succeed(source)
  }
}

export const layer = Layer.succeed(
  Highlighter,
  Highlighter.of(new NoopHighlighter()),
)

export const layerWith = (
  factory: () => Effect.Effect<IHighlighter>,
): Layer.Layer<never, never, Highlighter> =>
  Layer.effect(
    Highlighter,
    Effect.flatMap(factory(), (impl) => Effect.succeed(Highlighter.of(impl))),
  )
