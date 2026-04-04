import { Schema } from "effect"
import { KdlSchema as K } from "~/kdl"
import { SourceSpan } from "~/miette"
import {
  assert,
  assertResultFailure,
  assertResultSuccess,
  describe,
  test,
} from "~test/fixtures.js"

describe("Node", () => {
  describe("with string arg and prop", () => {
    const schema = K.Node("bundle", {
      name: K.Arg(0, K.V(Schema.String)),
      version: K.Prop("version", K.V(Schema.String)),
    })
    const decode = K.decodeSourceResult(schema)

    test("accepts node with arg and prop", ({ expect }) => {
      const value = assertResultSuccess(
        decode(`bundle "mylib" version="1.0.0"`),
      )
      expect(value.name).toEqual("bundle")
      expect(value.children.name.data.value).toEqual("mylib")
      expect(value.children.version.data.value).toEqual("1.0.0")
    })

    test("accepts node with arg and prop - span", ({ expect }) => {
      const value = assertResultSuccess(
        decode(`bundle "mylib" version="1.0.0"`),
      )
      expect(value.span).toEqual(SourceSpan.from(0, 30))
      expect(value.nameSpan).toEqual(SourceSpan.from(0, 6))
      expect(value.children.name.data.span).toEqual(SourceSpan.from(7, 7))
      expect(value.children.version.nameSpan).toEqual(SourceSpan.from(15, 7))
      expect(value.children.version.data.span).toEqual(SourceSpan.from(23, 7))
    })

    test("rejects wrong name", ({ expect }) => {
      const r = assertResultFailure(decode(`package "mylib" version="1.0.0"`))
      expect(r.toString()).toEqual(
        `Expected node to have name "bundle", got "package"`,
      )
    })

    test("rejects missing arg", ({ expect }) => {
      const r = assertResultFailure(decode(`bundle version="1.0.0"`))
      expect(r.toString()).toEqual(
        'Expected node "bundle" to have argument at index 0\n  at ["name"]',
      )
    })

    test("rejects missing prop", ({ expect }) => {
      const r = assertResultFailure(decode(`bundle "mylib"`))
      expect(r.toString()).toEqual(
        'Expected node "bundle" to have property "version"\n  at ["version"]',
      )
    })

    test("rejects wrong arg type", ({ expect }) => {
      const r = assertResultFailure(decode(`bundle 42 version="1.0.0"`))
      expect(r.toString()).toEqual('Expected string, got 42\n  at ["name"]')
    })

    test("rejects wrong prop type", ({ expect }) => {
      const r = assertResultFailure(decode(`bundle "mylib" version=42`))
      expect(r.toString()).toEqual('Expected string, got 42\n  at ["version"]')
    })
  })

  describe("with number arg and prop", () => {
    const schema = K.Node("add", {
      a: K.Arg(0, K.V(Schema.Number)),
      b: K.Prop("b", K.V(Schema.Number)),
    })
    const decode = K.decodeSourceResult(schema)

    test("accepts node with number args", ({ expect }) => {
      const value = assertResultSuccess(decode(`add 5 b=10`))
      expect(value.children.a.data.value).toEqual(5)
      expect(value.children.b.data.value).toEqual(10)
    })

    test("accepts node with number args - span", ({ expect }) => {
      const value = assertResultSuccess(decode(`add 5 b=10`))
      expect(value.children.a.data.span).toEqual(SourceSpan.from(4, 1))
      expect(value.children.b.data.span).toEqual(SourceSpan.from(8, 2))
    })
  })

  describe("with boolean arg and prop", () => {
    const schema = K.Node("config", {
      enabled: K.Arg(0, K.V(Schema.Boolean)),
      verbose: K.Prop("verbose", K.V(Schema.Boolean)),
    })
    const decode = K.decodeSourceResult(schema)

    test("accepts node with boolean args", ({ expect }) => {
      const value = assertResultSuccess(decode(`config #true verbose=#false`))
      expect(value.children.enabled.data.value).toEqual(true)
      expect(value.children.verbose.data.value).toEqual(false)
    })
  })

  describe("with URLFromString", () => {
    const schema = K.Node("link", {
      url: K.Arg(0, K.V(Schema.URLFromString)),
    })
    const decode = K.decodeSourceResult(schema)

    test("accepts URL arg", ({ expect }) => {
      const value = assertResultSuccess(decode(`link "https://github.com"`))
      expect(value.children.url.data.value).toEqual(
        new URL("https://github.com"),
      )
    })

    test("accepts URL arg - span", ({ expect }) => {
      const value = assertResultSuccess(decode(`link "https://github.com"`))
      expect(value.children.url.data.span).toEqual(SourceSpan.from(5, 20))
    })
  })

  describe("with allowTagged", () => {
    const schema = K.Node("value", {
      data: K.Arg(0, K.V(Schema.String).pipe(K.allowTagged)),
    })
    const decode = K.decodeSourceResult(schema)

    test("accepts tagged value", ({ expect }) => {
      const value = assertResultSuccess(decode(`value (type)"hello"`))
      expect(value.children.data.data.value).toEqual("hello")
      expect(value.children.data.data.tagName).toEqual("type")
    })

    test("accepts untagged value", ({ expect }) => {
      const value = assertResultSuccess(decode(`value "hello"`))
      expect(value.children.data.data.value).toEqual("hello")
      expect(value.children.data.data.tagName).toBeUndefined()
    })

    test("accepts tagged value - span", ({ expect }) => {
      const value = assertResultSuccess(decode(`value (type)"hello"`))
      const data = value.children.data.data
      expect(data.span).toEqual(SourceSpan.from(6, 13))
      expect(data.tagSpan).toEqual(SourceSpan.from(6, 6))
    })
  })

  describe("with multiple args", () => {
    const schema = K.Node("add", {
      a: K.Arg(0, K.V(Schema.Number)),
      b: K.Arg(1, K.V(Schema.Number)),
    })
    const decode = K.decodeSourceResult(schema)

    test("accepts multiple args at different indices", ({ expect }) => {
      const value = assertResultSuccess(decode(`add 5 10`))
      expect(value.children.a.data.value).toEqual(5)
      expect(value.children.b.data.value).toEqual(10)
    })

    test("rejects missing second arg", ({ expect }) => {
      const r = assertResultFailure(decode(`add 5`))
      expect(r.toString()).toEqual(
        'Expected node "add" to have argument at index 1\n  at ["b"]',
      )
    })
  })

  describe("rejects", () => {
    const schema = K.Node("bundle", {
      name: K.Arg(0, K.V(Schema.String)),
      version: K.Prop("version", K.V(Schema.String)),
    })
    const decode = K.decodeSourceResult(schema)

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
      const r = assertResultFailure(decode(source))
      expect(r.toString()).toEqual(expected)
    })
  })
})

describe("Option", () => {
  describe("with string", () => {
    const schema = K.Node("bundle", {
      output: K.Opt("output", K.V(Schema.String)),
    })
    const decode = K.decodeSourceResult(schema)

    test("accepts child node", ({ expect }) => {
      const value = assertResultSuccess(decode(`bundle { output "dist" }`))
      expect(value.children.output.data.value).toEqual("dist")
      expect(value.children.output.source).toEqual("node")
    })

    test("accepts child node - span", ({ expect }) => {
      const value = assertResultSuccess(decode(`bundle { output "lib" }`))
      expect(value.children.output.span).toEqual(SourceSpan.from(16, 5))
      expect(value.children.output.nameSpan).toEqual(SourceSpan.from(9, 6))
    })

    test("accepts property", ({ expect }) => {
      const value = assertResultSuccess(decode(`bundle output="bin"`))
      expect(value.children.output.data.value).toEqual("bin")
      expect(value.children.output.source).toEqual("property")
    })

    test("accepts property - span", ({ expect }) => {
      const value = assertResultSuccess(decode(`bundle output="src"`))
      expect(value.children.output.span).toEqual(SourceSpan.from(14, 5))
      expect(value.children.output.nameSpan).toEqual(SourceSpan.from(7, 6))
    })

    test("prefers child over property", ({ expect }) => {
      const value = assertResultSuccess(
        decode(`bundle output="fallback" { output "primary" }`),
      )
      expect(value.children.output.data.value).toEqual("primary")
      expect(value.children.output.source).toEqual("node")
    })

    test("rejects when neither exists", ({ expect }) => {
      const r = assertResultFailure(decode(`bundle`))
      expect(r.toString()).toEqual(
        'Expected node "bundle" to have either a child node or a property named "output"\n  at ["output"]',
      )
    })
  })

  describe("with number", () => {
    const schema = K.Node("config", {
      port: K.Opt("port", K.V(Schema.Number)),
    })
    const decode = K.decodeSourceResult(schema)

    test("accepts child node", ({ expect }) => {
      const value = assertResultSuccess(decode(`config { port 3000 }`))
      expect(value.children.port.data.value).toEqual(3000)
      expect(value.children.port.source).toEqual("node")
    })

    test("accepts property", ({ expect }) => {
      const value = assertResultSuccess(decode(`config port=8080`))
      expect(value.children.port.data.value).toEqual(8080)
      expect(value.children.port.source).toEqual("property")
    })
  })
})

describe("Many", () => {
  const ItemNode = K.Node("item", {
    value: K.Arg(0, K.V(Schema.String)),
  })
  const schema = K.Many(ItemNode)
  const decode = K.decodeSourceResult(schema)

  test("accepts multiple nodes on separate lines", ({ expect }) => {
    const value = assertResultSuccess(decode(`item "a"\nitem "b"\nitem "c"`))
    expect(value).toHaveLength(3)
    expect(value[0]?.children.value.data.value).toEqual("a")
    expect(value[1]?.children.value.data.value).toEqual("b")
    expect(value[2]?.children.value.data.value).toEqual("c")
  })

  test("accepts multiple nodes on same line with semicolons", ({ expect }) => {
    const value = assertResultSuccess(decode(`item "a"; item "b"; item "c"`))
    expect(value).toHaveLength(3)
    expect(value[0]?.children.value.data.value).toEqual("a")
    expect(value[1]?.children.value.data.value).toEqual("b")
    expect(value[2]?.children.value.data.value).toEqual("c")
  })

  test("accepts single node", ({ expect }) => {
    const value = assertResultSuccess(decode(`item "only"`))
    expect(value).toHaveLength(1)
    expect(value[0]?.children.value.data.value).toEqual("only")
  })

  test("accepts zero nodes", ({ expect }) => {
    const value = assertResultSuccess(decode(`other "something"`))
    expect(value).toHaveLength(0)
  })

  test("errors: first (default)", ({ expect }) => {
    const r = assertResultFailure(decode(`item "good"\nitem 42`))
    expect(r.toString()).toEqual('Expected string, got 42\n  at [1]["value"]')
  })

  test("errors: all - accumulates all errors", ({ expect }) => {
    const r = assertResultFailure(
      decode(`item 1\nitem 2\nitem 3`, { errors: "all" }),
    )
    assert(r._tag === "Composite")
    expect(r.issues).toHaveLength(3)
  })
})

describe("Literal", () => {
  describe("with Schema.Literal", () => {
    const schema = K.Node("language", {
      code: K.Arg(0, K.V(Schema.Literals(["en", "es"]))),
    })
    const decode = K.decodeSourceResult(schema)

    test("accepts valid literal 'en'", ({ expect }) => {
      const value = assertResultSuccess(decode(`language "en"`))
      expect(value.children.code.data.value).toEqual("en")
    })

    test("accepts valid literal 'es'", ({ expect }) => {
      const value = assertResultSuccess(decode(`language "es"`))
      expect(value.children.code.data.value).toEqual("es")
    })

    test("rejects invalid literal 'ch'", ({ expect }) => {
      const r = assertResultFailure(decode(`language "ch"`))
      expect(r.toString()).toEqual(
        'Expected "en" | "es", got "ch"\n  at ["code"]',
      )
    })
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
  const decode = K.decodeSourceResult(schema)

  test("parses Many, Node, and Opt fields", ({ expect }) => {
    const value = assertResultSuccess(
      decode(`
      package "pkg1"
      package "pkg2"
      bundle "mybundle"
      setting "debug"
    `),
    )
    expect(value.packages).toHaveLength(2)
    expect(value.packages[0]?.children.name.data.value).toEqual("pkg1")
    expect(value.packages[1]?.children.name.data.value).toEqual("pkg2")
    expect(value.bundle.children.name.data.value).toEqual("mybundle")
    expect(value.setting.data.value).toEqual("debug")
  })

  test("Node fails when missing", ({ expect }) => {
    const issue = assertResultFailure(decode(`package "pkg1"`))
    expect(issue.toString()).toEqual(
      'Expected document to have node "bundle"\n  at ["bundle"]',
    )
  })

  test("Opt fails when missing in document", ({ expect }) => {
    const issue = assertResultFailure(decode(`package "pkg1" bundle "b"`))
    expect(issue.toString()).toEqual(
      'Expected document to have node "bundle"\n  at ["bundle"]',
    )
  })
})

describe("optional", () => {
  describe("optional Arg - package with optional version", () => {
    const schema = K.Node("package", {
      name: K.Arg(0, K.V(Schema.String)),
      version: K.optional(K.Arg(1, K.V(Schema.String))),
    })
    const decode = K.decodeSourceResult(schema)

    test("accepts package with version", ({ expect }) => {
      const value = assertResultSuccess(decode(`package "mylib" "1.0.0"`))
      expect(value.children.name.data.value).toEqual("mylib")
      expect(value.children.version?.data.value).toEqual("1.0.0")
    })

    test("accepts package without version", ({ expect }) => {
      const value = assertResultSuccess(decode(`package "mylib"`))
      expect(value.children.name.data.value).toEqual("mylib")
      expect(value.children.version).toBeUndefined()
    })

    test("rejects invalid version type", ({ expect }) => {
      const r = assertResultFailure(decode(`package "mylib" 42`))
      expect(r.toString()).toEqual('Expected string, got 42\n  at ["version"]')
    })
  })

  describe("optional Prop - server with optional port", () => {
    const schema = K.Node("server", {
      host: K.Arg(0, K.V(Schema.String)),
      port: K.optional(K.Prop("port", K.V(Schema.Number))),
    })
    const decode = K.decodeSourceResult(schema)

    test("accepts server with port property", ({ expect }) => {
      const value = assertResultSuccess(decode(`server "localhost" port=3000`))
      expect(value.children.host.data.value).toEqual("localhost")
      expect(value.children.port?.data.value).toEqual(3000)
    })

    test("accepts server without port property", ({ expect }) => {
      const value = assertResultSuccess(decode(`server "localhost"`))
      expect(value.children.host.data.value).toEqual("localhost")
      expect(value.children.port).toBeUndefined()
    })
  })

  describe("optional Opt - git remote with optional url", () => {
    const schema = K.Node("repo", {
      name: K.Arg(0, K.V(Schema.String)),
      remote: K.optional(K.Opt("remote", K.V(Schema.String))),
    })
    const decode = K.decodeSourceResult(schema)

    test("accepts remote as child node", ({ expect }) => {
      const value = assertResultSuccess(
        decode(`repo "myapp" { remote "origin" }`),
      )
      expect(value.children.remote?.data.value).toEqual("origin")
      expect(value.children.remote?.source).toEqual("node")
    })

    test("accepts remote as property", ({ expect }) => {
      const value = assertResultSuccess(decode(`repo "myapp" remote="origin"`))
      expect(value.children.remote?.data.value).toEqual("origin")
      expect(value.children.remote?.source).toEqual("property")
    })

    test("prefers child over property", ({ expect }) => {
      const value = assertResultSuccess(
        decode(`repo "myapp" remote="fallback" { remote "primary" }`),
      )
      expect(value.children.remote?.data.value).toEqual("primary")
    })

    test("accepts repo without remote", ({ expect }) => {
      const value = assertResultSuccess(decode(`repo "myapp"`))
      expect(value.children.remote).toBeUndefined()
    })
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
    const decode = K.decodeSourceResult(schema)

    test("accepts project with build and test", ({ expect }) => {
      const value = assertResultSuccess(
        decode(`project "myapp" \nbuild "tsc" \ntest "vitest"`),
      )
      expect(value.project.children.name.data.value).toEqual("myapp")
      expect(value.build?.children.command.data.value).toEqual("tsc")
      expect(value.test?.children.command.data.value).toEqual("vitest")
    })

    test("accepts project with only build", ({ expect }) => {
      const value = assertResultSuccess(
        decode(`project "myapp" \nbuild "esbuild"`),
      )
      expect(value.build?.children.command.data.value).toEqual("esbuild")
      expect(value.test).toBeUndefined()
    })

    test("accepts project without optional nodes", ({ expect }) => {
      const value = assertResultSuccess(decode(`project "myapp"`))
      expect(value.project.children.name.data.value).toEqual("myapp")
      expect(value.build).toBeUndefined()
      expect(value.test).toBeUndefined()
    })

    test("rejects when required project missing", ({ expect }) => {
      const r = assertResultFailure(decode(`build "tsc"`))
      expect(r.toString()).toEqual(
        'Expected document to have node "project"\n  at ["project"]',
      )
    })
  })

  describe("mixed required and optional - deployment config", () => {
    const schema = K.Node("deployment", {
      name: K.Arg(0, K.V(Schema.String)),
      image: K.Prop("image", K.V(Schema.String)),
      replicas: K.optional(K.Prop("replicas", K.V(Schema.Number))),
      env: K.optional(K.Opt("env", K.V(Schema.String))),
    })
    const decode = K.decodeSourceResult(schema)

    test("full deployment with all fields", ({ expect }) => {
      const value = assertResultSuccess(
        decode(`deployment "api" image="nginx:latest" replicas=3 env="prod"`),
      )
      expect(value.children.name.data.value).toEqual("api")
      expect(value.children.image.data.value).toEqual("nginx:latest")
      expect(value.children.replicas?.data.value).toEqual(3)
      expect(value.children.env?.data.value).toEqual("prod")
    })

    test("minimal deployment with only required", ({ expect }) => {
      const value = assertResultSuccess(
        decode(`deployment "api" image="nginx:latest"`),
      )
      expect(value.children.name.data.value).toEqual("api")
      expect(value.children.image.data.value).toEqual("nginx:latest")
      expect(value.children.replicas).toBeUndefined()
      expect(value.children.env).toBeUndefined()
    })

    test("deployment with optional env as child node", ({ expect }) => {
      const value = assertResultSuccess(
        decode(`deployment "api" image="nginx:latest" { env "staging" }`),
      )
      expect(value.children.env?.data.value).toEqual("staging")
      expect(value.children.env?.source).toEqual("node")
    })
  })
})
