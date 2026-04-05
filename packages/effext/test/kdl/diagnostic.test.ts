import { Effect, Schema } from "effect"
import { KdlSchema as K, kdl } from "~/kdl"
import type { Diagnostic } from "~/miette"
import { test } from "~test/fixtures.js"

class SampleSchema extends Schema.Opaque<SampleSchema>()(
  K.Document({
    package: K.Node("package", {
      name: K.Arg(0, K.V(Schema.String)),
      version: K.Prop("version", K.V(Schema.String)),
    }),
  }),
) {}

class SettingSchema extends Schema.Opaque<SettingSchema>()(
  K.Document({
    package: K.Node("package", {
      name: K.Arg(0, K.V(Schema.String)),
      version: K.Prop("version", K.V(Schema.String)),
    }),
    setting: K.Node("setting", {
      value: K.Arg(0, K.V(Schema.String)),
      enabled: K.Prop("enabled", K.V(Schema.Boolean)),
    }),
  }),
) {}
const parseString = K.diagnosticString(SampleSchema)
const parseSettingString = K.diagnosticString(SettingSchema)

test("parses valid file", ({ expect }) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const value = yield* parseString(kdl`package "mylib" version="1.0.0"`)
      expect(value.package.children.name.data.value).toBe("mylib")
    }),
  ))

test("returns Diagnostic with kdl code on error", ({ expect }) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const diagnostic = yield* Effect.flip(parseString(kdl`package`))
      const pointer = yield* diagnosticPointsTo(diagnostic)
      expect(diagnostic.code).toEqual("kdl::node_requires_argument")
      expect(diagnostic.help).toEqual("Add the argument")
      expect(pointer).toEqual("package")
    }),
  ))

test("returns Diagnostic for missing property", ({ expect }) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const diagnostic = yield* Effect.flip(parseString(kdl`package "mylib"`))
      const pointer = yield* diagnosticPointsTo(diagnostic)
      expect(diagnostic.code).toEqual("kdl::node_requires_property")
      expect(diagnostic.help).toEqual("Add the property")
      expect(pointer).toEqual('package "mylib"')
    }),
  ))

test("returns Diagnostic for missing document node", ({ expect }) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const diagnostic = yield* Effect.flip(parseString(kdl`bundle "core"`))
      expect(diagnostic.code).toEqual("kdl::document_requires_node")
      expect(diagnostic.help).toEqual(
        'Add a node named "package" to the document',
      )

      expect(
        diagnostic.labels,
        "because it points to the whole document it doesn't make sense to show a labeled span",
      ).toBeUndefined()
    }),
  ))

test("returns Diagnostic for missing argument on existing node", ({ expect }) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const diagnostic = yield* Effect.flip(
        parseSettingString(kdl`
          package "mylib" version="1.0.0"
          setting
        `),
      )
      const pointer = yield* diagnosticPointsTo(diagnostic)
      expect(diagnostic.code).toEqual("kdl::node_requires_argument")
      expect(diagnostic.help).toEqual("Add the argument")
      expect(pointer).toEqual("setting")
    }),
  ))

test("returns Diagnostic for missing property on existing node", ({ expect }) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const diagnostic = yield* Effect.flip(
        parseSettingString(kdl`
          package "mylib" version="1.0.0"
          setting "debug"
        `),
      )
      const pointer = yield* diagnosticPointsTo(diagnostic)
      expect(diagnostic.code).toEqual("kdl::node_requires_property")
      expect(diagnostic.help).toEqual("Add the property")
      expect(pointer).toEqual('setting "debug"')
    }),
  ))

test("returns Diagnostic for node name mismatch", ({ expect }) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const diagnostic = yield* Effect.flip(parseString(kdl`wrongnode "mylib"`))
      expect(diagnostic.code).toEqual("kdl::document_requires_node")
      expect(diagnostic.help).toEqual(
        'Add a node named "package" to the document',
      )
      expect(
        diagnostic.labels,
        "because it points to the whole document it doesn't make sense to show a labeled span",
      ).toBeUndefined()
    }),
  ))

test("returns Diagnostic for invalid value type", ({ expect }) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const diagnostic = yield* Effect.flip(
        parseString(kdl`package "mylib" version=42`),
      )
      const pointer = yield* diagnosticPointsTo(diagnostic)
      expect(diagnostic.code).toEqual("kdl::invalid_value")
      expect(diagnostic.help).toEqual("Use a valid value")
      expect(pointer).toEqual("42")
    }),
  ))

test("returns Diagnostic for tag not allowed", ({ expect }) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const diagnostic = yield* Effect.flip(
        parseString(kdl`package (user)"mylib" version="1.0.0"`),
      )
      const pointer = yield* diagnosticPointsTo(diagnostic)
      expect(diagnostic.code).toEqual("kdl::tag_not_allowed")
      expect(diagnostic.help).toEqual("Remove the tag")
      expect(pointer).toEqual("(user)")
    }),
  ))

test("returns Diagnostic for invalid identifier", ({ expect }) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const diagnostic = yield* Effect.flip(parseString(kdl`lorem[ipsum`))
      expect(diagnostic.code).toEqual("kdl::parse_error")
      expect(diagnostic.labels).toBeDefined()
      expect(diagnostic.labels?.length).toBe(1)
      const label0 = diagnostic.labels?.[0]
      expect(label0?.label).toEqual(
        'Unexpected character "[", did you forget to quote an identifier?',
      )
      const pointer = yield* diagnosticPointsTo(diagnostic)
      expect(pointer).toEqual("m")
    }),
  ))

test("returns Diagnostic for multiple parse errors", ({ expect }) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const diagnostic = yield* Effect.flip(
        parseString(kdl`test null true false [ohno]`),
      )
      expect(diagnostic.code).toEqual("kdl::parse_error")
      expect(diagnostic.labels).toBeDefined()
      expect(diagnostic.labels?.length).toBe(4)
      const [l0, l1, l2, l3] = diagnostic.labels ?? []
      expect(l0?.label).toEqual(
        'Invalid keyword "null", add a leading # to use the keyword or surround with quotes to make it a string',
      )
      expect(l1?.label).toEqual(
        'Invalid keyword "true", add a leading # to use the keyword or surround with quotes to make it a string',
      )
      expect(l2?.label).toEqual(
        'Invalid keyword "false", add a leading # to use the keyword or surround with quotes to make it a string',
      )
      expect(l3?.label).toEqual(
        'Unexpected character "[", did you forget to quote an identifier?',
      )
      const pointer0 = yield* diagnosticPointsTo(diagnostic, 0)
      expect(pointer0).toEqual("l")
      const pointer1 = yield* diagnosticPointsTo(diagnostic, 1)
      expect(pointer1).toEqual("e")
      const pointer2 = yield* diagnosticPointsTo(diagnostic, 2)
      expect(pointer2).toEqual("e")
      const pointer3 = yield* diagnosticPointsTo(diagnostic, 3)
      expect(pointer3).toEqual(" ")
    }),
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
