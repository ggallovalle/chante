import { Tag as ModelTag, Value as ModelValue } from "@bgotink/kdl"
import { Result, Schema } from "effect"
import { assert, describe } from "vitest"
import { KdlSchema } from "~/kdl.js"
import { SourceSpan } from "~/miette.js"
import { test } from "~test/fixtures.js"

describe("Value", () => {
  describe("primitive string", () => {
    const inner = Schema.String
    const schema = KdlSchema.Value(inner)
    const decode = Schema.decodeUnknownResult(schema)

    test("accepts string values", ({ expect }) => {
      const result = decode(new ModelValue("john"))
      expect(Result.getOrThrow(result)).toEqual({
        value: "john",
        span: undefined,
      })
    })

    test("rejects tagged values", ({ expect }) => {
      const value = new ModelValue("john")
      value.tag = new ModelTag("name")
      const r = decode(value)
      assert(r._tag === "Failure")
      expect(r.failure.toString()).toEqual(`Expected no tag name, got "name"`)
    })

    test("rejects any other value", ({ expect }) => {
      const rNumber = decode(new ModelValue(10))
      assert(rNumber._tag === "Failure")
      expect(rNumber.failure.toString()).toEqual("Expected string, got 10")
      const rBool = decode(new ModelValue(true))
      assert(rBool._tag === "Failure")
      expect(rBool.failure.toString()).toEqual("Expected string, got true")
      const rNull = decode(new ModelValue(null))
      assert(rNull._tag === "Failure")
      expect(rNull.failure.toString()).toEqual("Expected string, got null")
    })
  })

  describe("primitive number", () => {
    const inner = Schema.Number
    const schema = KdlSchema.Value(inner)
    const decode = Schema.decodeUnknownResult(schema)

    test("accepts number values", ({ expect }) => {
      const result = decode(new ModelValue(42))
      expect(Result.getOrThrow(result)).toEqual({
        value: 42,
        span: undefined,
      })
    })

    test("rejects tagged values", ({ expect }) => {
      const value = new ModelValue(42)
      value.tag = new ModelTag("person")
      const r = decode(value)
      assert(r._tag === "Failure")
      expect(r.failure.toString()).toEqual(`Expected no tag name, got "person"`)
    })

    test("rejects any other value", ({ expect }) => {
      const rString = decode(new ModelValue("john"))
      assert(rString._tag === "Failure")
      expect(rString.failure.toString()).toEqual(`Expected number, got "john"`)
      const rBool = decode(new ModelValue(true))
      assert(rBool._tag === "Failure")
      expect(rBool.failure.toString()).toEqual("Expected number, got true")
      const rNull = decode(new ModelValue(null))
      assert(rNull._tag === "Failure")
      expect(rNull.failure.toString()).toEqual("Expected number, got null")
    })
  })

  describe("primitive boolean", () => {
    const inner = Schema.Boolean
    const schema = KdlSchema.Value(inner)
    const decode = Schema.decodeUnknownResult(schema)

    test("accepts boolean values", ({ expect }) => {
      const result = decode(new ModelValue(true))
      expect(Result.getOrThrow(result)).toEqual({
        value: true,
        span: undefined,
      })
    })

    test("rejects tagged values", ({ expect }) => {
      const value = new ModelValue(true)
      value.tag = new ModelTag("float")
      const r = decode(value)
      assert(r._tag === "Failure")
      expect(r.failure.toString()).toEqual(`Expected no tag name, got "float"`)
    })

    test("rejects any other value", ({ expect }) => {
      const rString = decode(new ModelValue("doe"))
      assert(rString._tag === "Failure")
      expect(rString.failure.toString()).toEqual(`Expected boolean, got "doe"`)
      const rNumber = decode(new ModelValue(67))
      assert(rNumber._tag === "Failure")
      expect(rNumber.failure.toString()).toEqual("Expected boolean, got 67")
      const rNull = decode(new ModelValue(null))
      assert(rNull._tag === "Failure")
      expect(rNull.failure.toString()).toEqual("Expected boolean, got null")
    })
  })
})

describe("ValueTagged", () => {
  describe("primitive string", () => {
    const inner = Schema.String
    const schema = KdlSchema.Value(inner).pipe(KdlSchema.allowTagged)
    const decode = KdlSchema.decodeSourceResult(schema)

    test("accepts string values", ({ expect }) => {
      const result = decode(`"john"`)
      expect(Result.getOrThrow(result)).toEqual({
        value: "john",
        span: SourceSpan.from(0, 6),
      })
    })

    test("rejects any other value", ({ expect }) => {
      const rNumber = decode("10")
      assert(rNumber._tag === "Failure")
      expect(rNumber.failure.toString()).toEqual("Expected string, got 10")
      const rBool = decode("#true")
      assert(rBool._tag === "Failure")
      expect(rBool.failure.toString()).toEqual("Expected string, got true")
      const rNull = decode("#null")
      assert(rNull._tag === "Failure")
      expect(rNull.failure.toString()).toEqual("Expected string, got null")
    })
  })

  describe("primitive number", () => {
    const inner = Schema.Number
    const schema = KdlSchema.Value(inner).pipe(KdlSchema.allowTagged)
    const decode = Schema.decodeUnknownResult(schema)

    test("accepts number values", ({ expect }) => {
      const value = new ModelValue(42)
      value.tag = new ModelTag("person")
      const result = decode(value)
      expect(Result.getOrThrow(result)).toEqual({
        value: 42,
        tagName: "person",
        tagSpan: undefined,
        span: undefined,
      })
    })

    test("rejects any other value", ({ expect }) => {
      const rString = decode(new ModelValue("john"))
      assert(rString._tag === "Failure")
      expect(rString.failure.toString()).toEqual(`Expected number, got "john"`)
      const rBool = decode(new ModelValue(true))
      assert(rBool._tag === "Failure")
      expect(rBool.failure.toString()).toEqual("Expected number, got true")
      const rNull = decode(new ModelValue(null))
      assert(rNull._tag === "Failure")
      expect(rNull.failure.toString()).toEqual("Expected number, got null")
    })
  })

  describe("primitive boolean", () => {
    const inner = Schema.Boolean
    const schema = KdlSchema.Value(inner).pipe(KdlSchema.allowTagged)
    const decode = Schema.decodeUnknownResult(schema)

    test("accepts boolean values", ({ expect }) => {
      const result = decode(new ModelValue(true))
      expect(Result.getOrThrow(result)).toEqual({
        value: true,
        tag: undefined,
        span: undefined,
      })
    })

    test("rejects any other value", ({ expect }) => {
      const rString = decode(new ModelValue("doe"))
      assert(rString._tag === "Failure")
      expect(rString.failure.toString()).toEqual(`Expected boolean, got "doe"`)
      const rNumber = decode(new ModelValue(67))
      assert(rNumber._tag === "Failure")
      expect(rNumber.failure.toString()).toEqual("Expected boolean, got 67")
      const rNull = decode(new ModelValue(null))
      assert(rNull._tag === "Failure")
      expect(rNull.failure.toString()).toEqual("Expected boolean, got null")
    })
  })

  describe("from string inner", () => {
    const inner = Schema.URLFromString
    const schema = KdlSchema.Value(inner).pipe(KdlSchema.allowTagged)
    const decode = Schema.decodeUnknownResult(schema)

    test("accepts strings", ({ expect }) => {
      const result = decode(new ModelValue("https://github.com"))
      const value = Result.getOrThrow(result)
      expect(value).toEqual({
        value: new URL("https://github.com"),
        tag: undefined,
        span: undefined,
      })
    })
  })
})

describe("EntryArgument", () => {
  const valueSchema = KdlSchema.Value(Schema.String)
  const schema = KdlSchema.EntryArgument(0, valueSchema)
  const decode = KdlSchema.decodeSourceResult(schema)

  test("accepts string argument at index", ({ expect }) => {
    const result = decode(`format "kdl"`)
    const value = Result.getOrThrow(result)
    expect(value.index).toEqual(0)
    expect(value.data.value).toEqual("kdl")
    expect(value.data.span).toBeDefined()
  })

  test("rejects when argument missing", ({ expect }) => {
    const r = decode("bundle")
    assert(r._tag === "Failure")
    expect(r.failure.toString()).toEqual(
      `Expected node "bundle" to have argument at index 0`,
    )
  })

  test("rejects wrong type", ({ expect }) => {
    const r = decode(`use-effect #true`)
    assert(r._tag === "Failure")
    expect(r.failure.toString()).toEqual("Expected string, got true")
  })
})

describe("EntryProperty", () => {
  const valueSchema = KdlSchema.Value(Schema.String)
  const schema = KdlSchema.EntryProperty("name", valueSchema)
  const decode = KdlSchema.decodeSourceResult(schema)

  test("accepts string property", ({ expect }) => {
    const result = decode(`bundle name="mylib"`)
    const value = Result.getOrThrow(result)
    expect(value.name).toEqual("name")
    expect(value.data.value).toEqual("mylib")
    expect(value.data.span).toBeDefined()
    expect(value.data.span?.offset).toEqual(12)
    expect(value.data.span?.length).toEqual(7)
    expect(value.span).toBeDefined()
    expect(value.nameSpan).toBeDefined()
    expect(value.span?.offset).toEqual(7)
    expect(value.span?.length).toEqual(12)
    expect(value.nameSpan?.offset).toEqual(7)
    expect(value.nameSpan?.length).toEqual(4)
  })

  test("rejects when property missing", ({ expect }) => {
    const r = decode(`bundle`)
    assert(r._tag === "Failure")
    expect(r.failure.toString()).toEqual(
      `Expected node "bundle" to have property "name"`,
    )
    const failure = r.failure as {
      annotations: { kdlSpan?: { offset: number; length: number } }
    }
    expect(failure.annotations.kdlSpan).toBeDefined()
    expect(failure.annotations.kdlSpan?.offset).toEqual(0)
    expect(failure.annotations.kdlSpan?.length).toEqual(6)
  })

  test("rejects wrong type", ({ expect }) => {
    const r = decode(`bundle name=42`)
    assert(r._tag === "Failure")
    expect(r.failure.toString()).toEqual("Expected string, got 42")
    const failure = r.failure as { annotations: { kdlSpan?: unknown } }
    expect(failure.annotations.kdlSpan).toBeDefined()
  })
})

describe("EntryProperty with ValueTagged", () => {
  describe("with String", () => {
    const valueSchema = KdlSchema.Value(Schema.String).pipe(
      KdlSchema.allowTagged,
    )
    const schema = KdlSchema.EntryProperty("name", valueSchema)
    const decode = KdlSchema.decodeSourceResult(schema)

    test("accepts property without tag", ({ expect }) => {
      const result = decode(`bundle name="mylib"`)
      const value = Result.getOrThrow(result)
      expect(value.name).toEqual("name")
      expect(value.data.value).toEqual("mylib")
      expect(value.data.tagName).toBeUndefined()
      expect(value.data.span).toBeDefined()
      expect(value.span).toBeDefined()
      expect(value.nameSpan).toBeDefined()
    })
  })

  describe("with URLFromString", () => {
    const valueSchema = KdlSchema.Value(Schema.URLFromString).pipe(
      KdlSchema.allowTagged,
    )
    const schema = KdlSchema.EntryProperty("url", valueSchema)
    const decode = KdlSchema.decodeSourceResult(schema)

    test("accepts URL property", ({ expect }) => {
      const result = decode(`bundle url="https://github.com"`)
      const value = Result.getOrThrow(result) as {
        name: string
        data: { value: URL; tagName: string | undefined }
      }
      expect(value.name).toEqual("url")
      expect(value.data.value).toEqual(new URL("https://github.com"))
      expect(value.data.tagName).toBeUndefined()
    })
  })
})
