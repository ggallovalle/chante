import { Effect, Layer, Schema } from "effect"
import { KdlSchema as K } from "~/kdl"
import type { Diagnostic } from "~/miette"
import { PlatformFileSystem, PlatformPath, test } from "~test/fixtures.js"

const testLayer = Layer.mergeAll(PlatformFileSystem.layer, PlatformPath.layer)

class SampleSchema extends Schema.Opaque<SampleSchema>()(
  K.Document({
    package: K.Node("package", {
      name: K.Arg(0, K.V(Schema.String)),
      version: K.Prop("version", K.V(Schema.String)),
    }),
  }),
) {}
const parseFile = K.diagnostFile(SampleSchema)

test("parses valid file", ({ expect }) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const value = yield* parseFile("test/fixtures/sample.kdl")
      expect(value.package.children.name.data.value).toBe("mylib")
    }).pipe(Effect.provide(testLayer)),
  ))

test("returns Diagnostic with kdl code on error", ({ expect }) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const diagnostic = yield* Effect.flip(
        parseFile("test/fixtures/requires-argument.kdl"),
      )
      const pointer = yield* diagnosticPointsTo(diagnostic)
      expect(diagnostic.code).toEqual("kdl::node_requires_argument")
      expect(diagnostic.help).toEqual("Add the argument")
      expect(pointer).toEqual("package")
    }).pipe(Effect.provide(testLayer)),
  ))

const diagnosticPointsTo = Effect.fnUntraced(function* (
  diagnostic: Diagnostic,
  labelIndex: number = 0,
) {
  // biome-ignore lint/style/noNonNullAssertion: I Know
  // biome-ignore lint/suspicious/noNonNullAssertedOptionalChain: I Know
  const label = diagnostic.labels?.at(labelIndex)!
  // biome-ignore lint/style/noNonNullAssertion: I Know
  const content = (yield* diagnostic.sourceCode!.readSpan(
    label.span,
    0,
    0,
  )).decode()
  return content
})
