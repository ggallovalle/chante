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

describe("schema errors", () => {
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
        yield* assertDiagnosticPointsTo(diagnostic, "package")
        expect(diagnostic.code).toEqual("kdl::node_requires_argument")
        expect(diagnostic.help).toEqual("Add the argument")
      }),
    ))

  test("returns Diagnostic for missing property", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parseString(kdl`package "mylib"`))
        yield* assertDiagnosticPointsTo(diagnostic, 'package "mylib"')
        expect(diagnostic.code).toEqual("kdl::node_requires_property")
        expect(diagnostic.help).toEqual("Add the property")
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

  test("returns Diagnostic for missing argument on existing node", ({
    expect,
  }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(
          parseSettingString(kdl`
            package "mylib" version="1.0.0"
            setting
          `),
        )
        yield* assertDiagnosticPointsTo(diagnostic, "setting")
        expect(diagnostic.code).toEqual("kdl::node_requires_argument")
        expect(diagnostic.help).toEqual("Add the argument")
      }),
    ))

  test("returns Diagnostic for missing property on existing node", ({
    expect,
  }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(
          parseSettingString(kdl`
            package "mylib" version="1.0.0"
            setting "debug"
          `),
        )
        yield* assertDiagnosticPointsTo(diagnostic, 'setting "debug"')
        expect(diagnostic.code).toEqual("kdl::node_requires_property")
        expect(diagnostic.help).toEqual("Add the property")
      }),
    ))

  test("returns Diagnostic for node name mismatch", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(
          parseString(kdl`wrongnode "mylib"`),
        )
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
        yield* assertDiagnosticPointsTo(diagnostic, "42")
        expect(diagnostic.code).toEqual("kdl::invalid_value")
        expect(diagnostic.help).toEqual("Use a valid value")
      }),
    ))

  test("returns Diagnostic for tag not allowed", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(
          parseString(kdl`package (user)"mylib" version="1.0.0"`),
        )
        yield* assertDiagnosticPointsTo(diagnostic, "(user)")
        expect(diagnostic.code).toEqual("kdl::tag_not_allowed")
        expect(diagnostic.help).toEqual("Remove the tag")
      }),
    ))
})

describe("Node", () => {
  describe("with string arg and prop", () => {
    const schema = K.Node("bundle", {
      name: K.Arg(0, K.V(Schema.String)),
      version: K.Prop("version", K.V(Schema.String)),
    })
    const parse = K.diagnosticString(schema)

    test("accepts node with arg and prop", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`bundle "mylib" version="1.0.0"`)
          expect(value.name).toEqual("bundle")
          expect(value.children.name.data.value).toEqual("mylib")
          expect(value.children.version.data.value).toEqual("1.0.0")
        }),
      ))

    test("accepts node with arg and prop - span", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`bundle "mylib" version="1.0.0"`)
          expect(value.span).toEqual(SourceSpan.from(0, 30))
          expect(value.nameSpan).toEqual(SourceSpan.from(0, 6))
          expect(value.children.name.data.span).toEqual(SourceSpan.from(7, 7))
          expect(value.children.version.nameSpan).toEqual(
            SourceSpan.from(15, 7),
          )
          expect(value.children.version.data.span).toEqual(
            SourceSpan.from(23, 7),
          )
        }),
      ))

    test("rejects wrong name", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const diagnostic = yield* Effect.flip(
            parse(kdl`package "mylib" version="1.0.0"`),
          )
          expect(diagnostic.code).toEqual("kdl::document_requires_node")
          expect(diagnostic.help).toEqual(
            'Add a node named "bundle" to the document',
          )
          expect(
            diagnostic.labels,
            "because it points to the whole document it doesn't make sense to show a labeled span",
          ).toBeUndefined()
        }),
      ))

    test("rejects missing arg", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const diagnostic = yield* Effect.flip(
            parse(kdl`bundle version="1.0.0"`),
          )
          yield* assertDiagnosticPointsTo(diagnostic, 'bundle version="1.0.0"')
          expect(diagnostic.code).toEqual("kdl::node_requires_argument")
          expect(diagnostic.help).toEqual("Add the argument")
        }),
      ))

    test("rejects missing prop", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const diagnostic = yield* Effect.flip(parse(kdl`bundle "mylib"`))
          yield* assertDiagnosticPointsTo(diagnostic, 'bundle "mylib"')
          expect(diagnostic.code).toEqual("kdl::node_requires_property")
          expect(diagnostic.help).toEqual("Add the property")
        }),
      ))

    test("rejects wrong arg type", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const diagnostic = yield* Effect.flip(
            parse(kdl`bundle 42 version="1.0.0"`),
          )
          yield* assertDiagnosticPointsTo(diagnostic, "42")
          expect(diagnostic.code).toEqual("kdl::invalid_value")
          expect(diagnostic.help).toEqual("Use a valid value")
        }),
      ))

    test("rejects wrong prop type", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const diagnostic = yield* Effect.flip(
            parse(kdl`bundle "mylib" version=42`),
          )
          yield* assertDiagnosticPointsTo(diagnostic, "42")
          expect(diagnostic.code).toEqual("kdl::invalid_value")
          expect(diagnostic.help).toEqual("Use a valid value")
        }),
      ))
  })

  describe("with number arg and prop", () => {
    const schema = K.Node("add", {
      a: K.Arg(0, K.V(Schema.Number)),
      b: K.Prop("b", K.V(Schema.Number)),
    })
    const parse = K.diagnosticString(schema)

    test("accepts node with number args", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`add 5 b=10`)
          expect(value.children.a.data.value).toEqual(5)
          expect(value.children.b.data.value).toEqual(10)
        }),
      ))

    test("accepts node with number args - span", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`add 5 b=10`)
          expect(value.children.a.data.span).toEqual(SourceSpan.from(4, 1))
          expect(value.children.b.data.span).toEqual(SourceSpan.from(8, 2))
        }),
      ))
  })

  describe("with boolean arg and prop", () => {
    const schema = K.Node("config", {
      enabled: K.Arg(0, K.V(Schema.Boolean)),
      verbose: K.Prop("verbose", K.V(Schema.Boolean)),
    })
    const parse = K.diagnosticString(schema)

    test("accepts node with boolean args", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`config #true verbose=#false`)
          expect(value.children.enabled.data.value).toEqual(true)
          expect(value.children.verbose.data.value).toEqual(false)
        }),
      ))
  })

  describe("with URLFromString", () => {
    const schema = K.Node("link", {
      url: K.Arg(0, K.V(Schema.URLFromString)),
    })
    const parse = K.diagnosticString(schema)

    test("accepts URL arg", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`link "https://github.com"`)
          expect(value.children.url.data.value).toEqual(
            new URL("https://github.com"),
          )
        }),
      ))

    test("accepts URL arg - span", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`link "https://github.com"`)
          expect(value.children.url.data.span).toEqual(SourceSpan.from(5, 20))
        }),
      ))
  })

  describe("with allowTagged", () => {
    const schema = K.Node("value", {
      data: K.Arg(0, K.V(Schema.String).pipe(K.allowTagged)),
    })
    const parse = K.diagnosticString(schema)

    test("accepts tagged value", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`value (type)"hello"`)
          expect(value.children.data.data.value).toEqual("hello")
          expect(value.children.data.data.tagName).toEqual("type")
        }),
      ))

    test("accepts untagged value", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`value "hello"`)
          expect(value.children.data.data.value).toEqual("hello")
          expect(value.children.data.data.tagName).toBeUndefined()
        }),
      ))

    test("accepts tagged value - span", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`value (type)"hello"`)
          const data = value.children.data.data
          expect(data.span).toEqual(SourceSpan.from(6, 13))
          expect(data.tagSpan).toEqual(SourceSpan.from(6, 6))
        }),
      ))
  })

  describe("with multiple args", () => {
    const schema = K.Node("add", {
      a: K.Arg(0, K.V(Schema.Number)),
      b: K.Arg(1, K.V(Schema.Number)),
    })
    const parse = K.diagnosticString(schema)

    test("accepts multiple args at different indices", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`add 5 10`)
          expect(value.children.a.data.value).toEqual(5)
          expect(value.children.b.data.value).toEqual(10)
        }),
      ))

    test("rejects missing second arg", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const diagnostic = yield* Effect.flip(parse(kdl`add 5`))
          expect(diagnostic.code).toEqual("kdl::node_requires_argument")
          expect(diagnostic.help).toEqual("Add the argument")
        }),
      ))
  })

  describe("rejects", () => {
    const schema = K.Node("bundle", {
      name: K.Arg(0, K.V(Schema.String)),
      version: K.Prop("version", K.V(Schema.String)),
    })
    const parse = K.diagnosticString(schema)

    test("rejects wrong name", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const diagnostic = yield* Effect.flip(
            parse(kdl`package "mylib" version="1.0.0"`),
          )
          expect(diagnostic.code).toEqual("kdl::document_requires_node")
          expect(diagnostic.help).toEqual(
            'Add a node named "bundle" to the document',
          )
        }),
      ))

    test("rejects missing arg", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const diagnostic = yield* Effect.flip(
            parse(kdl`bundle version="1.0.0"`),
          )
          expect(diagnostic.code).toEqual("kdl::node_requires_argument")
          expect(diagnostic.help).toEqual("Add the argument")
        }),
      ))

    test("rejects missing prop", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const diagnostic = yield* Effect.flip(parse(kdl`bundle "mylib"`))
          expect(diagnostic.code).toEqual("kdl::node_requires_property")
          expect(diagnostic.help).toEqual("Add the property")
        }),
      ))

    test("rejects wrong arg type", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const diagnostic = yield* Effect.flip(
            parse(kdl`bundle 42 version="1.0.0"`),
          )
          expect(diagnostic.code).toEqual("kdl::invalid_value")
          expect(diagnostic.help).toEqual("Use a valid value")
        }),
      ))

    test("rejects wrong prop type", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const diagnostic = yield* Effect.flip(
            parse(kdl`bundle "mylib" version=42`),
          )
          expect(diagnostic.code).toEqual("kdl::invalid_value")
          expect(diagnostic.help).toEqual("Use a valid value")
        }),
      ))
  })
})

describe("Option", () => {
  describe("with string", () => {
    const schema = K.Node("bundle", {
      output: K.Opt("output", K.V(Schema.String)),
    })
    const parse = K.diagnosticString(schema)

    test("accepts child node", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`bundle { output "dist" }`)
          expect(value.children.output.data.value).toEqual("dist")
          expect(value.children.output.source).toEqual("node")
        }),
      ))

    test("accepts child node - span", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`bundle { output "lib" }`)
          expect(value.children.output.span).toEqual(SourceSpan.from(16, 5))
          expect(value.children.output.nameSpan).toEqual(SourceSpan.from(9, 6))
        }),
      ))

    test("accepts property", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`bundle output="bin"`)
          expect(value.children.output.data.value).toEqual("bin")
          expect(value.children.output.source).toEqual("property")
        }),
      ))

    test("accepts property - span", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`bundle output="src"`)
          expect(value.children.output.span).toEqual(SourceSpan.from(14, 5))
          expect(value.children.output.nameSpan).toEqual(SourceSpan.from(7, 6))
        }),
      ))

    test("prefers child over property", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(
            kdl`bundle output="fallback" { output "primary" }`,
          )
          expect(value.children.output.data.value).toEqual("primary")
          expect(value.children.output.source).toEqual("node")
        }),
      ))

    test("rejects when neither exists", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const diagnostic = yield* Effect.flip(parse(kdl`bundle`))
          expect(diagnostic.code).toEqual(
            "kdl::option_requires_property_or_child",
          )
          expect(diagnostic.help).toEqual(
            'Add a child node or property named "output"',
          )
        }),
      ))
  })

  describe("with number", () => {
    const schema = K.Node("config", {
      port: K.Opt("port", K.V(Schema.Number)),
    })
    const parse = K.diagnosticString(schema)

    test("accepts child node", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`config { port 3000 }`)
          expect(value.children.port.data.value).toEqual(3000)
          expect(value.children.port.source).toEqual("node")
        }),
      ))

    test("accepts property", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`config port=8080`)
          expect(value.children.port.data.value).toEqual(8080)
          expect(value.children.port.source).toEqual("property")
        }),
      ))
  })
})

describe("Many", () => {
  const ItemNode = K.Node("item", {
    value: K.Arg(0, K.V(Schema.String)),
  })
  const schema = K.Many(ItemNode)
  const parse = K.diagnosticString(schema)

  test("accepts multiple nodes on separate lines", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const value = yield* parse(kdl`item "a"\nitem "b"\nitem "c"`)
        expect(value).toHaveLength(3)
        expect(value[0]?.children.value.data.value).toEqual("a")
        expect(value[1]?.children.value.data.value).toEqual("b")
        expect(value[2]?.children.value.data.value).toEqual("c")
      }),
    ))

  test("accepts multiple nodes on same line with semicolons", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const value = yield* parse(kdl`item "a"; item "b"; item "c"`)
        expect(value).toHaveLength(3)
        expect(value[0]?.children.value.data.value).toEqual("a")
        expect(value[1]?.children.value.data.value).toEqual("b")
        expect(value[2]?.children.value.data.value).toEqual("c")
      }),
    ))

  test("accepts single node", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const value = yield* parse(kdl`item "only"`)
        expect(value).toHaveLength(1)
        expect(value[0]?.children.value.data.value).toEqual("only")
      }),
    ))

  test("accepts zero nodes", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const value = yield* parse(kdl`other "something"`)
        expect(value).toHaveLength(0)
      }),
    ))

  test("errors: first (default)", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parse(kdl`item "good"\nitem 42`))
        expect(diagnostic.code).toEqual("kdl::invalid_value")
        expect(diagnostic.help).toEqual("Use a valid value")
      }),
    ))
})

describe("Literal", () => {
  describe("with Schema.Literal", () => {
    const schema = K.Node("language", {
      code: K.Arg(0, K.V(Schema.Literals(["en", "es"]))),
    })
    const parse = K.diagnosticString(schema)

    test("accepts valid literal 'en'", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`language "en"`)
          expect(value.children.code.data.value).toEqual("en")
        }),
      ))

    test("accepts valid literal 'es'", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`language "es"`)
          expect(value.children.code.data.value).toEqual("es")
        }),
      ))

    test("rejects invalid literal 'ch'", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const diagnostic = yield* Effect.flip(parse(kdl`language "ch"`))
          expect(diagnostic.code).toEqual("kdl::invalid_value")
          expect(diagnostic.help).toEqual("Use a valid value")
        }),
      ))
  })
})

describe("Document", () => {
  const PackageNode = K.Node("package", {
    name: K.Arg(0, K.V(Schema.String)),
  })
  const BundleNode = K.Node("bundle", {
    name: K.Arg(0, K.V(Schema.String)),
  })

  const schema = K.Document({
    packages: K.Many(PackageNode),
    bundle: BundleNode,
    setting: K.Opt("setting", K.V(Schema.String)),
  })
  const parse = K.diagnosticString(schema)

  test("parses Many, Node, and Opt fields", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const value = yield* parse(kdl`
        package "pkg1"
        package "pkg2"
        bundle "mybundle"
        setting "debug"
      `)
        expect(value.packages).toHaveLength(2)
        expect(value.packages[0]?.children.name.data.value).toEqual("pkg1")
        expect(value.packages[1]?.children.name.data.value).toEqual("pkg2")
        expect(value.bundle.children.name.data.value).toEqual("mybundle")
        expect(value.setting.data.value).toEqual("debug")
      }),
    ))

  test("Node fails when missing", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(parse(kdl`package "pkg1"`))
        expect(diagnostic.code).toEqual("kdl::document_requires_node")
        expect(diagnostic.help).toEqual(
          'Add a node named "bundle" to the document',
        )
      }),
    ))

  test("Opt fails when missing in document", ({ expect }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const diagnostic = yield* Effect.flip(
          parse(kdl`package "pkg1" bundle "b"`),
        )
        expect(diagnostic.code).toEqual("kdl::document_requires_node")
        expect(diagnostic.help).toEqual(
          'Add a node named "bundle" to the document',
        )
      }),
    ))
})

describe("optional", () => {
  describe("optional Arg - package with optional version", () => {
    const schema = K.Node("package", {
      name: K.Arg(0, K.V(Schema.String)),
      version: K.optional(K.Arg(1, K.V(Schema.String))),
    })
    const parse = K.diagnosticString(schema)

    test("accepts package with version", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`package "mylib" "1.0.0"`)
          expect(value.children.name.data.value).toEqual("mylib")
          expect(value.children.version?.data.value).toEqual("1.0.0")
        }),
      ))

    test("accepts package without version", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`package "mylib"`)
          expect(value.children.name.data.value).toEqual("mylib")
          expect(value.children.version).toBeUndefined()
        }),
      ))

    test("rejects invalid version type", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const diagnostic = yield* Effect.flip(parse(kdl`package "mylib" 42`))
          expect(diagnostic.code).toEqual("kdl::invalid_value")
          expect(diagnostic.help).toEqual("Use a valid value")
        }),
      ))
  })

  describe("optional Prop - server with optional port", () => {
    const schema = K.Node("server", {
      host: K.Arg(0, K.V(Schema.String)),
      port: K.optional(K.Prop("port", K.V(Schema.Number))),
    })
    const parse = K.diagnosticString(schema)

    test("accepts server with port property", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`server "localhost" port=3000`)
          expect(value.children.host.data.value).toEqual("localhost")
          expect(value.children.port?.data.value).toEqual(3000)
        }),
      ))

    test("accepts server without port property", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`server "localhost"`)
          expect(value.children.host.data.value).toEqual("localhost")
          expect(value.children.port).toBeUndefined()
        }),
      ))
  })

  describe("optional Opt - git remote with optional url", () => {
    const schema = K.Node("repo", {
      name: K.Arg(0, K.V(Schema.String)),
      remote: K.optional(K.Opt("remote", K.V(Schema.String))),
    })
    const parse = K.diagnosticString(schema)

    test("accepts remote as child node", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`repo "myapp" { remote "origin" }`)
          expect(value.children.remote?.data.value).toEqual("origin")
          expect(value.children.remote?.source).toEqual("node")
        }),
      ))

    test("accepts remote as property", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`repo "myapp" remote="origin"`)
          expect(value.children.remote?.data.value).toEqual("origin")
          expect(value.children.remote?.source).toEqual("property")
        }),
      ))

    test("prefers child over property", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(
            kdl`repo "myapp" remote="fallback" { remote "primary" }`,
          )
          expect(value.children.remote?.data.value).toEqual("primary")
        }),
      ))

    test("accepts repo without remote", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`repo "myapp"`)
          expect(value.children.remote).toBeUndefined()
        }),
      ))
  })

  describe("optional Node - project with optional build config", () => {
    const BuildNode = K.Node("build", {
      command: K.Arg(0, K.V(Schema.String)),
    })
    const TestNode = K.Node("test", {
      command: K.Arg(0, K.V(Schema.String)),
    })

    const schema = K.Document({
      project: K.Node("project", {
        name: K.Arg(0, K.V(Schema.String)),
      }),
      build: K.optional(BuildNode),
      test: K.optional(TestNode),
    })
    const parse = K.diagnosticString(schema)

    test("accepts project with build and test", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(
            kdl`project "myapp" \nbuild "tsc" \ntest "vitest"`,
          )
          expect(value.project.children.name.data.value).toEqual("myapp")
          expect(value.build?.children.command.data.value).toEqual("tsc")
          expect(value.test?.children.command.data.value).toEqual("vitest")
        }),
      ))

    test("accepts project with only build", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`project "myapp" \nbuild "esbuild"`)
          expect(value.build?.children.command.data.value).toEqual("esbuild")
          expect(value.test).toBeUndefined()
        }),
      ))

    test("accepts project without optional nodes", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`project "myapp"`)
          expect(value.project.children.name.data.value).toEqual("myapp")
          expect(value.build).toBeUndefined()
          expect(value.test).toBeUndefined()
        }),
      ))

    test("rejects when required project missing", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const diagnostic = yield* Effect.flip(parse(kdl`build "tsc"`))
          expect(diagnostic.code).toEqual("kdl::document_requires_node")
          expect(diagnostic.help).toEqual(
            'Add a node named "project" to the document',
          )
        }),
      ))
  })

  describe("mixed required and optional - deployment config", () => {
    const schema = K.Node("deployment", {
      name: K.Arg(0, K.V(Schema.String)),
      image: K.Prop("image", K.V(Schema.String)),
      replicas: K.optional(K.Prop("replicas", K.V(Schema.Number))),
      env: K.optional(K.Opt("env", K.V(Schema.String))),
    })
    const parse = K.diagnosticString(schema)

    test("full deployment with all fields", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(
            kdl`deployment "api" image="nginx:latest" replicas=3 env="prod"`,
          )
          expect(value.children.name.data.value).toEqual("api")
          expect(value.children.image.data.value).toEqual("nginx:latest")
          expect(value.children.replicas?.data.value).toEqual(3)
          expect(value.children.env?.data.value).toEqual("prod")
        }),
      ))

    test("minimal deployment with only required", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(kdl`deployment "api" image="nginx:latest"`)
          expect(value.children.name.data.value).toEqual("api")
          expect(value.children.image.data.value).toEqual("nginx:latest")
          expect(value.children.replicas).toBeUndefined()
          expect(value.children.env).toBeUndefined()
        }),
      ))

    test("deployment with optional env as child node", ({ expect }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const value = yield* parse(
            kdl`deployment "api" image="nginx:latest" { env "staging" }`,
          )
          expect(value.children.env?.data.value).toEqual("staging")
          expect(value.children.env?.source).toEqual("node")
        }),
      ))
  })
})
