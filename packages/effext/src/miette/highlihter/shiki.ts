import { Effect, Layer } from "effect"
import { Highlighter, type IHighlighter, NoopHighlighter } from "./noop.js"

export class ShikiHighlighter implements IHighlighter {
  #codeToANSI: typeof import("@shikijs/cli").codeToANSI
  #theme: string

  constructor(
    codeToANSI: typeof import("@shikijs/cli").codeToANSI,
    theme: string,
  ) {
    this.#codeToANSI = codeToANSI
    this.#theme = theme
  }

  highlight(source: string, language?: string): Effect.Effect<string> {
    return Effect.promise(() =>
      // biome-ignore lint/suspicious/noExplicitAny: I know
      this.#codeToANSI(source, language ?? ("txt" as any), this.#theme as any),
    )
  }
}

const loadShiki = Effect.tryPromise({
  try: async () => {
    const mod = await import("@shikijs/cli")
    return new ShikiHighlighter(mod.codeToANSI, "github-dark")
  },
  catch: () => new NoopHighlighter(),
})

export const layer = Layer.effect(
  Highlighter,
  Effect.flatMap(loadShiki, (impl) => Effect.succeed(Highlighter.of(impl))),
)
