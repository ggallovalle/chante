import { Effect, Schema } from "effect"
import { KdlSchema as K, kdl } from "~/kdl"
import { SourceSpan } from "~/miette"
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
        expect(diagnostic.code).toEqual("kdl::unexpected_character")
        expect(diagnostic.labels).toBeDefined()
        expect(diagnostic.labels?.length).toBe(1)
        const label0 = diagnostic.labels?.[0]
        expect(label0?.label).toEqual('Unexpected character "["')
        yield* assertDiagnosticPointsTo(diagnostic, "m")
      }),
    ))

  test("returns Diagnostic for multiple parse errors", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(
          parseString(kdl`test null true false [ohno]`),
        )
        expect(diagnostic.code).toEqual("kdl::unexpected_character")
        expect(diagnostic.help).toEqual(
          "Did you forget to quote an identifier?",
        )
        expect(diagnostic.labels).toBeDefined()
        expect(diagnostic.labels?.length).toBe(4)
        const [l0, l1, l2, l3] = diagnostic.labels ?? []
        expect(l0?.label).toEqual('Invalid keyword "null"')
        expect(l1?.label).toEqual('Invalid keyword "true"')
        expect(l2?.label).toEqual('Invalid keyword "false"')
        expect(l3?.label).toEqual('Unexpected character "["')
        yield* assertDiagnosticPointsTo(diagnostic, "null", 0)
        yield* assertDiagnosticPointsTo(diagnostic, "true", 1)
        yield* assertDiagnosticPointsTo(diagnostic, "false", 2)
        yield* assertDiagnosticPointsTo(diagnostic, " ", 3)
      }),
    ))

  test("invalid node children - missing closing brace", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString(kdl`test { child `))
        expect(diagnostic.code).toEqual("kdl::invalid_node_children")
        expect(diagnostic.help).toEqual("Check for missing closing brace")
        expect(diagnostic.labels?.[0]?.label).toEqual("Invalid node children")
        yield* assertDiagnosticPointsTo(diagnostic, SourceSpan.from(12, 1))
      }),
    ))

  test("expected a value - property without value", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString(kdl`test key=`))
        expect(diagnostic.code).toEqual("kdl::expected_value")
        expect(diagnostic.help).toEqual("Add a value after the property name")
        expect(diagnostic.labels?.[0]?.label).toEqual("Expected a value")
        yield* assertDiagnosticPointsTo(diagnostic, "=")
      }),
    ))

  test("invalid tag - unclosed paren", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString(kdl`test (`))
        expect(diagnostic.code).toEqual("kdl::invalid_tag")
        expect(diagnostic.help).toEqual(
          "Surround the tag with quotes to use it as a string",
        )
        expect(diagnostic.labels?.[0]?.label).toEqual("Invalid tag")
        yield* assertDiagnosticPointsTo(diagnostic, SourceSpan.from(5, 1))
      }),
    ))

  test("invalid argument", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString(kdl`test (foo)`))
        expect(diagnostic.code).toEqual("kdl::invalid_argument")
        expect(diagnostic.help).toEqual("Check the argument syntax")
        expect(diagnostic.labels?.[0]?.label).toEqual("Invalid argument")
        yield* assertDiagnosticPointsTo(diagnostic, SourceSpan.from(9, 1))
      }),
    ))

  test("unexpected token", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString(kdl`test )`))
        expect(diagnostic.code).toEqual("kdl::unexpected_token")
        expect(diagnostic.help).toEqual(
          "Did you forget to quote an identifier?",
        )
        expect(diagnostic.labels?.[0]?.label).toEqual('Unexpected token ")"')
        yield* assertDiagnosticPointsTo(diagnostic, SourceSpan.from(4, 1))
      }),
    ))

  test("unexpected character", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString(kdl`test [ohno]`))
        expect(diagnostic.code).toEqual("kdl::unexpected_character")
        expect(diagnostic.help).toEqual(
          "Did you forget to quote an identifier?",
        )
        expect(diagnostic.labels?.[0]?.label).toEqual(
          'Unexpected character "["',
        )
        yield* assertDiagnosticPointsTo(diagnostic, SourceSpan.from(4, 1))
      }),
    ))

  test("unclosed string", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString(kdl`test "foo`))
        expect(diagnostic.code).toEqual("kdl::unclosed_string")
        expect(diagnostic.help).toEqual("Add the closing quote")
        expect(diagnostic.labels?.[0]?.label).toEqual("Unclosed string")
        yield* assertDiagnosticPointsTo(diagnostic, SourceSpan.from(8, 1))
      }),
    ))

  test("invalid decimal number - missing exponent", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString(kdl`test 10e++`))
        expect(diagnostic.code).toEqual("kdl::invalid_decimal")
        expect(diagnostic.help).toEqual("Check the decimal number syntax")
        expect(diagnostic.labels?.[0]?.label).toEqual("Invalid decimal number")
        yield* assertDiagnosticPointsTo(diagnostic, SourceSpan.from(5, 5))
      }),
    ))

  test("invalid decimal number - trailing dot", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString(kdl`test 1.`))
        expect(diagnostic.code).toEqual("kdl::invalid_decimal")
        expect(diagnostic.help).toEqual("Check the decimal number syntax")
        expect(diagnostic.labels?.[0]?.label).toEqual("Invalid decimal number")
        yield* assertDiagnosticPointsTo(diagnostic, SourceSpan.from(6, 1))
      }),
    ))

  test("invalid number with suffix", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString(kdl`test 1e5x`))
        expect(diagnostic.code).toEqual("kdl::invalid_number_suffix")
        expect(diagnostic.help).toEqual(
          "A number with an exponent cannot have a suffix",
        )
        expect(diagnostic.labels?.[0]?.label).toEqual(
          "Invalid number with suffix",
        )
        yield* assertDiagnosticPointsTo(diagnostic, SourceSpan.from(5, 4))
      }),
    ))

  test("invalid escape sequence", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString("test a\\b"))
        expect(diagnostic.code).toEqual("kdl::invalid_escape")
        expect(diagnostic.help).toEqual(
          "Use a valid escape sequence or remove the backslash",
        )
        expect(diagnostic.labels?.[0]?.label).toEqual("Invalid escape sequence")
        yield* assertDiagnosticPointsTo(diagnostic, SourceSpan.from(6, 1))
      }),
    ))

  test("multiple children blocks", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString(kdl`node {} {}`))
        expect(diagnostic.code).toEqual("kdl::multiple_children_blocks")
        expect(diagnostic.help).toEqual(
          "A node can only have one children block",
        )
        expect(diagnostic.labels?.[0]?.label).toEqual(
          "Multiple children blocks",
        )
        yield* assertDiagnosticPointsTo(diagnostic, SourceSpan.from(9, 1))
      }),
    ))

  test("unexpected hashed suffix on string", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString(kdl`test "foo"#bar`))
        expect(diagnostic.code).toEqual("kdl::unexpected_hashed_suffix")
        expect(diagnostic.help).toEqual("Only numbers can have suffixes")
        expect(diagnostic.labels?.[0]?.label).toEqual(
          "Unexpected hashed suffix on a string",
        )
      }),
    ))

  test("unexpected hashed suffix on string", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString(kdl`test "foo"#bar`))
        expect(diagnostic.code).toEqual("kdl::unexpected_hashed_suffix")
        expect(diagnostic.help).toEqual("Only numbers can have suffixes")
        expect(diagnostic.labels?.[0]?.label).toEqual(
          "Unexpected hashed suffix on a string",
        )
      }),
    ))

  test("unclosed comment", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString(kdl`test /* comment`))
        expect(diagnostic.code).toEqual("kdl::unclosed_comment")
        expect(diagnostic.help).toEqual(
          "Add the closing */ to close the multiline comment",
        )
        expect(diagnostic.labels?.[0]?.label).toEqual("Unclosed comment")
      }),
    ))

  test("invalid unicode escape", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString('test "foo\\u{zg}"'))
        expect(diagnostic.code).toEqual("kdl::invalid_unicode_escape")
        expect(diagnostic.help).toEqual(
          "Use a valid unicode scalar value (0x0 to 0x10FFFF)",
        )
        expect(diagnostic.labels?.[0]?.label).toEqual(
          'Invalid unicode escape "\\u{zg}"',
        )
      }),
    ))

  test("unexpected slashdash", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString(kdl`test /-`))
        expect(diagnostic.code).toEqual("kdl::unexpected_slashdash")
        expect(diagnostic.help).toEqual(
          "Add a node name or whitespace after /-",
        )
        expect(diagnostic.labels?.[0]?.label).toEqual("Unexpected slashdash")
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
