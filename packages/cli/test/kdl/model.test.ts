import { Result, Schema } from "effect"
import { assert, describe } from "vitest"
import { KdlSchema } from "~/kdl.js"
import { SourceSpan } from "~/miette.js"
import { test } from "~test/fixtures.js"

describe("Node", () => {
  describe("with string arg and prop", () => {
    const schema = KdlSchema.Node("bundle", {
      name: KdlSchema.Arg(0, KdlSchema.V(Schema.String)),
      version: KdlSchema.Prop("version", KdlSchema.V(Schema.String)),
    })
    const decode = KdlSchema.decodeSourceResult(schema)

    test("accepts node with arg and prop", ({ expect }) => {
      const result = decode(`bundle "mylib" version="1.0.0"`)
      const value = Result.getOrThrow(result)
      expect(value.name).toEqual("bundle")
      expect(value.children.name.data.value).toEqual("mylib")
      expect(value.children.version.data.value).toEqual("1.0.0")
    })

    test("accepts node with arg and prop - span", ({ expect }) => {
      const result = decode(`bundle "mylib" version="1.0.0"`)
      expect(result._tag).toEqual("Success")
      const value = Result.getOrThrow(result)
      expect(value.span).toEqual(SourceSpan.from(0, 30))
      expect(value.nameSpan).toEqual(SourceSpan.from(0, 6))
      expect(value.children.name.data.span).toEqual(SourceSpan.from(7, 7))
      expect(value.children.version.nameSpan).toEqual(SourceSpan.from(15, 7))
      expect(value.children.version.data.span).toEqual(SourceSpan.from(23, 7))
    })

    test("rejects wrong name", ({ expect }) => {
      const r = decode(`package "mylib" version="1.0.0"`)
      assert(r._tag === "Failure")
      expect(r.failure.toString()).toEqual(
        `Expected node to have name "bundle", got "package"`,
      )
    })

    test("rejects missing arg", ({ expect }) => {
      const r = decode(`bundle version="1.0.0"`)
      assert(r._tag === "Failure")
      expect(r.failure.toString()).toEqual(
        'Expected node "bundle" to have argument at index 0\n  at ["name"]',
      )
    })

    test("rejects missing prop", ({ expect }) => {
      const r = decode(`bundle "mylib"`)
      assert(r._tag === "Failure")
      expect(r.failure.toString()).toEqual(
        'Expected node "bundle" to have property "version"\n  at ["version"]',
      )
    })

    test("rejects wrong arg type", ({ expect }) => {
      const r = decode(`bundle 42 version="1.0.0"`)
      assert(r._tag === "Failure")
      expect(r.failure.toString()).toEqual(
        'Expected string, got 42\n  at ["name"]',
      )
    })

    test("rejects wrong prop type", ({ expect }) => {
      const r = decode(`bundle "mylib" version=42`)
      assert(r._tag === "Failure")
      expect(r.failure.toString()).toEqual(
        'Expected string, got 42\n  at ["version"]',
      )
    })
  })

  describe("with number arg and prop", () => {
    const schema = KdlSchema.Node("add", {
      a: KdlSchema.Arg(0, KdlSchema.V(Schema.Number)),
      b: KdlSchema.Prop("b", KdlSchema.V(Schema.Number)),
    })
    const decode = KdlSchema.decodeSourceResult(schema)

    test("accepts node with number args", ({ expect }) => {
      const result = decode(`add 5 b=10`)
      const value = Result.getOrThrow(result)
      expect(value.children.a.data.value).toEqual(5)
      expect(value.children.b.data.value).toEqual(10)
    })

    test("accepts node with number args - span", ({ expect }) => {
      const result = decode(`add 5 b=10`)
      expect(result._tag).toEqual("Success")
      const value = Result.getOrThrow(result)
      expect(value.children.a.data.span).toEqual(SourceSpan.from(4, 1))
      expect(value.children.b.data.span).toEqual(SourceSpan.from(8, 2))
    })
  })

  describe("with boolean arg and prop", () => {
    const schema = KdlSchema.Node("config", {
      enabled: KdlSchema.Arg(0, KdlSchema.V(Schema.Boolean)),
      verbose: KdlSchema.Prop("verbose", KdlSchema.V(Schema.Boolean)),
    })
    const decode = KdlSchema.decodeSourceResult(schema)

    test("accepts node with boolean args", ({ expect }) => {
      const result = decode(`config #true verbose=#false`)
      const value = Result.getOrThrow(result)
      expect(value.children.enabled.data.value).toEqual(true)
      expect(value.children.verbose.data.value).toEqual(false)
    })
  })

  describe("with URLFromString", () => {
    const schema = KdlSchema.Node("link", {
      url: KdlSchema.Arg(0, KdlSchema.V(Schema.URLFromString)),
    })
    const decode = KdlSchema.decodeSourceResult(schema)

    test("accepts URL arg", ({ expect }) => {
      const result = decode(`link "https://github.com"`)
      const value = Result.getOrThrow(result)
      expect(value.children.url.data.value).toEqual(
        new URL("https://github.com"),
      )
    })

    test("accepts URL arg - span", ({ expect }) => {
      const result = decode(`link "https://github.com"`)
      expect(result._tag).toEqual("Success")
      expect(Result.getOrThrow(result).children.url.data.span).toEqual(
        SourceSpan.from(5, 20),
      )
    })
  })

  describe("with allowTagged", () => {
    const schema = KdlSchema.Node("value", {
      data: KdlSchema.Arg(
        0,
        KdlSchema.V(Schema.String).pipe(KdlSchema.allowTagged),
      ),
    })
    const decode = KdlSchema.decodeSourceResult(schema)

    test("accepts tagged value", ({ expect }) => {
      const result = decode(`value (type)"hello"`)
      const value = Result.getOrThrow(result)
      expect(value.children.data.data.value).toEqual("hello")
      expect(value.children.data.data.tagName).toEqual("type")
    })

    test("accepts untagged value", ({ expect }) => {
      const result = decode(`value "hello"`)
      const value = Result.getOrThrow(result)
      expect(value.children.data.data.value).toEqual("hello")
      expect(value.children.data.data.tagName).toBeUndefined()
    })

    test("accepts tagged value - span", ({ expect }) => {
      const result = decode(`value (type)"hello"`)
      expect(result._tag).toEqual("Success")
      const data = Result.getOrThrow(result).children.data.data
      expect(data.span).toEqual(SourceSpan.from(6, 13))
      expect(data.tagSpan).toEqual(SourceSpan.from(6, 6))
    })
  })

  describe("with multiple args", () => {
    const schema = KdlSchema.Node("add", {
      a: KdlSchema.Arg(0, KdlSchema.V(Schema.Number)),
      b: KdlSchema.Arg(1, KdlSchema.V(Schema.Number)),
    })
    const decode = KdlSchema.decodeSourceResult(schema)

    test("accepts multiple args at different indices", ({ expect }) => {
      const result = decode(`add 5 10`)
      const value = Result.getOrThrow(result)
      expect(value.children.a.data.value).toEqual(5)
      expect(value.children.b.data.value).toEqual(10)
    })

    test("rejects missing second arg", ({ expect }) => {
      const r = decode(`add 5`)
      assert(r._tag === "Failure")
      expect(r.failure.toString()).toEqual(
        'Expected node "add" to have argument at index 1\n  at ["b"]',
      )
    })
  })

  describe("rejects", () => {
    const schema = KdlSchema.Node("bundle", {
      name: KdlSchema.Arg(0, KdlSchema.V(Schema.String)),
      version: KdlSchema.Prop("version", KdlSchema.V(Schema.String)),
    })
    const decode = KdlSchema.decodeSourceResult(schema)

    test.for([
      [
        "wrong name",
        `package "mylib" version="1.0.0"`,
        'Expected node to have name "bundle", got "package"',
      ],
      [
        "missing arg",
        `bundle version="1.0.0"`,
        'Expected node "bundle" to have argument at index 0\n  at ["name"]',
      ],
      [
        "missing prop",
        `bundle "mylib"`,
        'Expected node "bundle" to have property "version"\n  at ["version"]',
      ],
      [
        "wrong arg type",
        `bundle 42 version="1.0.0"`,
        'Expected string, got 42\n  at ["name"]',
      ],
      [
        "wrong prop type",
        `bundle "mylib" version=42`,
        'Expected string, got 42\n  at ["version"]',
      ],
    ] as [string, string, string][])("rejects %s", ([_, source, expected], {
      expect,
    }) => {
      const r = decode(source)
      assert(r._tag === "Failure")
      expect(r.failure.toString()).toEqual(expected)
    })
  })
})

describe("Option", () => {
  describe("with string", () => {
    const schema = KdlSchema.Node("bundle", {
      output: KdlSchema.Opt("output", KdlSchema.V(Schema.String)),
    })
    const decode = KdlSchema.decodeSourceResult(schema)

    test("accepts child node", ({ expect }) => {
      const result = decode(`bundle { output "dist" }`)
      const value = Result.getOrThrow(result)
      expect(value.children.output.data.value).toEqual("dist")
      expect(value.children.output.source).toEqual("node")
    })

    test("accepts child node - span", ({ expect }) => {
      const result = decode(`bundle { output "lib" }`)
      const value = Result.getOrThrow(result)
      expect(value.children.output.span).toEqual(SourceSpan.from(16, 5))
      expect(value.children.output.nameSpan).toEqual(SourceSpan.from(9, 6))
    })

    test("accepts property", ({ expect }) => {
      const result = decode(`bundle output="bin"`)
      const value = Result.getOrThrow(result)
      expect(value.children.output.data.value).toEqual("bin")
      expect(value.children.output.source).toEqual("property")
    })

    test("accepts property - span", ({ expect }) => {
      const result = decode(`bundle output="src"`)
      const value = Result.getOrThrow(result)
      expect(value.children.output.span).toEqual(SourceSpan.from(14, 5))
      expect(value.children.output.nameSpan).toEqual(SourceSpan.from(7, 6))
    })

    test("prefers child over property", ({ expect }) => {
      const result = decode(`bundle output="fallback" { output "primary" }`)
      const value = Result.getOrThrow(result)
      expect(value.children.output.data.value).toEqual("primary")
      expect(value.children.output.source).toEqual("node")
    })

    test("rejects when neither exists", ({ expect }) => {
      const r = decode(`bundle`)
      assert(r._tag === "Failure")
      expect(r.failure.toString()).toEqual(
        'Expected node "bundle" to have either a child node named "output" or a property "output"\n  at ["output"]',
      )
    })
  })

  describe("with number", () => {
    const schema = KdlSchema.Node("config", {
      port: KdlSchema.Opt("port", KdlSchema.V(Schema.Number)),
    })
    const decode = KdlSchema.decodeSourceResult(schema)

    test("accepts child node", ({ expect }) => {
      const result = decode(`config { port 3000 }`)
      const value = Result.getOrThrow(result)
      expect(value.children.port.data.value).toEqual(3000)
      expect(value.children.port.source).toEqual("node")
    })

    test("accepts property", ({ expect }) => {
      const result = decode(`config port=8080`)
      const value = Result.getOrThrow(result)
      expect(value.children.port.data.value).toEqual(8080)
      expect(value.children.port.source).toEqual("property")
    })
  })
})
