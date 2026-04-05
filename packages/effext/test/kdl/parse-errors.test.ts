import { Effect, Schema } from "effect"
import { KdlSchema as K, kdl } from "~/kdl"
import { assertDiagnosticPointsTo, describe, test } from "~test/fixtures.js"

class SampleSchema extends Schema.Opaque<SampleSchema>()(
  K.Document({
    package: K.Node("package", {
      name: K.Arg(0, K.V(Schema.String)),
      version: K.Prop("version", K.V(Schema.String)),
    }),
  }),
) {}
const parseString = K.diagnosticString(SampleSchema)

describe("parse errors", () => {
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
        yield* assertDiagnosticPointsTo(diagnostic, "m")
      }),
    ))

  test("returns Diagnostic for multiple parse errors", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(
          parseString(kdl`test null true false [ohno]`),
        )
        expect(diagnostic.code).toEqual("kdl::invalid_keyword")
        expect(diagnostic.help).toEqual(
          "Add a leading # to use the keyword or surround with quotes to make it a string",
        )
        expect(diagnostic.labels).toBeDefined()
        expect(diagnostic.labels?.length).toBe(4)
        const [l0, l1, l2, l3] = diagnostic.labels ?? []
        expect(l0?.label).toEqual('Invalid keyword "null"')
        expect(l1?.label).toEqual('Invalid keyword "true"')
        expect(l2?.label).toEqual('Invalid keyword "false"')
        expect(l3?.label).toEqual(
          'Unexpected character "[", did you forget to quote an identifier?',
        )
        yield* assertDiagnosticPointsTo(diagnostic, "null", 0)
        yield* assertDiagnosticPointsTo(diagnostic, "true", 1)
        yield* assertDiagnosticPointsTo(diagnostic, "false", 2)
        yield* assertDiagnosticPointsTo(diagnostic, " ", 3)
      }),
    ))
})

describe("keyword errors", () => {
  test("case sensitivity - #NULL vs #null", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString(kdl`test #NULL`))
        expect(diagnostic.code).toEqual("kdl::invalid_keyword")
        expect(diagnostic.help).toEqual(
          'Keywords are case sensitive, write "#null" instead',
        )
        expect(diagnostic.labels).toBeDefined()
        expect(diagnostic.labels?.length).toBe(1)
        expect(diagnostic.labels?.[0]?.label).toEqual('Invalid keyword "#NULL"')
        yield* assertDiagnosticPointsTo(diagnostic, "#NULL")
      }),
    ))

  test("case sensitivity - #TRUE vs #true", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString(kdl`test #TRUE`))
        expect(diagnostic.code).toEqual("kdl::invalid_keyword")
        expect(diagnostic.help).toEqual(
          'Keywords are case sensitive, write "#true" instead',
        )
        expect(diagnostic.labels?.[0]?.label).toEqual('Invalid keyword "#TRUE"')
        yield* assertDiagnosticPointsTo(diagnostic, "#TRUE")
      }),
    ))

  test("typo suggestion - #nul", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString(kdl`test #nul`))
        expect(diagnostic.code).toEqual("kdl::invalid_keyword")
        expect(diagnostic.help).toEqual("Did you mean #null?")
        expect(diagnostic.labels?.[0]?.label).toEqual('Invalid keyword "#nul"')
        yield* assertDiagnosticPointsTo(diagnostic, "#nul")
      }),
    ))

  test("typo suggestion - #fals", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString(kdl`test #fals`))
        expect(diagnostic.code).toEqual("kdl::invalid_keyword")
        expect(diagnostic.help).toEqual("Did you mean #false?")
        expect(diagnostic.labels?.[0]?.label).toEqual('Invalid keyword "#fals"')
        yield* assertDiagnosticPointsTo(diagnostic, "#fals")
      }),
    ))

  test("typo suggestion - #ture", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString(kdl`test #ture`))
        expect(diagnostic.code).toEqual("kdl::invalid_keyword")
        expect(diagnostic.help).toEqual("Did you mean #true?")
        expect(diagnostic.labels?.[0]?.label).toEqual('Invalid keyword "#ture"')
        yield* assertDiagnosticPointsTo(diagnostic, "#ture")
      }),
    ))

  test("typo suggestion - #ifn", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString(kdl`test #ifn`))
        expect(diagnostic.code).toEqual("kdl::invalid_keyword")
        expect(diagnostic.help).toEqual("Did you mean #inf?")
        expect(diagnostic.labels?.[0]?.label).toEqual('Invalid keyword "#ifn"')
        yield* assertDiagnosticPointsTo(diagnostic, "#ifn")
      }),
    ))
})
