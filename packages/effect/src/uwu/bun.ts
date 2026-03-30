import { Effect, Layer } from "effect"
import { AnsiBunStyler, Styler } from "./index.js"

export { AnsiBunStyler }

export const AnsiBunStylerLayer = Layer.effect(
  Styler,
  Effect.sync(() => new AnsiBunStyler()),
)
