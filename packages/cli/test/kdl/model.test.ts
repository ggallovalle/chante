import { Result, Schema } from "effect"
import { assert, describe } from "vitest"
import { KdlSchema } from "~/kdl.js"
import { SourceSpan } from "~/miette.js"
import { test } from "~test/fixtures.js"

describe("Value", () => {
  describe("primitive string", () => {
    const schema = KdlSchema.EntryArgument(0, KdlSchema.Value(Schema.String))
    const decode = KdlSchema.decodeSourceResult(schema)

    test("accepts string values", ({ expect }) => {
      const result = decode(`arg "john"`)
      expect(Result.getOrThrow(result).data.value).toEqual("john")
    })

    test("accepts string values - span", ({ expect }) => {
      const result = decode(`arg "john"`)
      expect(result._tag).toEqual("Success")
      expect(Result.getOrThrow(result).data.span).toEqual(SourceSpan.from(4, 6))
    })

    test("rejects tagged values", ({ expect }) => {
      const r = decode(`arg (name)"john"`)
      assert(r._tag === "Failure")
      expect(r.failure.toString()).toEqual(`Expected no tag name, got "name"`)
    })

    test("rejects any other value", ({ expect }) => {
      const rNumber = decode(`arg 10`)
      assert(rNumber._tag === "Failure")
      expect(rNumber.failure.toString()).toEqual("Expected string, got 10")
      const rBool = decode(`arg #true`)
      assert(rBool._tag === "Failure")
      expect(rBool.failure.toString()).toEqual("Expected string, got true")
      const rNull = decode(`arg #null`)
      assert(rNull._tag === "Failure")
      expect(rNull.failure.toString()).toEqual("Expected string, got null")
    })
  })

  describe("primitive number", () => {
    const schema = KdlSchema.EntryArgument(0, KdlSchema.Value(Schema.Number))
    const decode = KdlSchema.decodeSourceResult(schema)

    test("accepts number values", ({ expect }) => {
      const result = decode(`arg 42`)
      expect(Result.getOrThrow(result).data.value).toEqual(42)
    })

    test("accepts number values - span", ({ expect }) => {
      const result = decode(`arg 42`)
      expect(result._tag).toEqual("Success")
      expect(Result.getOrThrow(result).data.span).toEqual(SourceSpan.from(4, 2))
    })

    test("rejects tagged values", ({ expect }) => {
      const r = decode(`arg (person)42`)
      assert(r._tag === "Failure")
      expect(r.failure.toString()).toEqual(`Expected no tag name, got "person"`)
    })

    test("rejects any other value", ({ expect }) => {
      const rString = decode(`arg "john"`)
      assert(rString._tag === "Failure")
      expect(rString.failure.toString()).toEqual(`Expected number, got "john"`)
      const rBool = decode(`arg #true`)
      assert(rBool._tag === "Failure")
      expect(rBool.failure.toString()).toEqual("Expected number, got true")
      const rNull = decode(`arg #null`)
      assert(rNull._tag === "Failure")
      expect(rNull.failure.toString()).toEqual("Expected number, got null")
    })
  })

  describe("primitive boolean", () => {
    const schema = KdlSchema.EntryArgument(0, KdlSchema.Value(Schema.Boolean))
    const decode = KdlSchema.decodeSourceResult(schema)

    test("accepts boolean values", ({ expect }) => {
      const result = decode(`arg #true`)
      expect(Result.getOrThrow(result).data.value).toEqual(true)
    })

    test("accepts boolean values - span", ({ expect }) => {
      const result = decode(`arg #true`)
      expect(result._tag).toEqual("Success")
      expect(Result.getOrThrow(result).data.span).toEqual(SourceSpan.from(4, 5))
    })

    test("rejects tagged values", ({ expect }) => {
      const r = decode(`arg (float)#true`)
      assert(r._tag === "Failure")
      expect(r.failure.toString()).toEqual(`Expected no tag name, got "float"`)
    })

    test("rejects any other value", ({ expect }) => {
      const rString = decode(`arg "doe"`)
      assert(rString._tag === "Failure")
      expect(rString.failure.toString()).toEqual(`Expected boolean, got "doe"`)
      const rNumber = decode(`arg 67`)
      assert(rNumber._tag === "Failure")
      expect(rNumber.failure.toString()).toEqual("Expected boolean, got 67")
      const rNull = decode(`arg #null`)
      assert(rNull._tag === "Failure")
      expect(rNull.failure.toString()).toEqual("Expected boolean, got null")
    })
  })

  describe("from string inner", () => {
    const schema = KdlSchema.EntryArgument(
      0,
      KdlSchema.Value(Schema.URLFromString),
    )
    const decode = KdlSchema.decodeSourceResult(schema)

    test("accepts strings", ({ expect }) => {
      const result = decode(`arg "https://github.com"`)
      expect(Result.getOrThrow(result).data.value).toEqual(
        new URL("https://github.com"),
      )
    })

    test("accepts strings - span", ({ expect }) => {
      const result = decode(`arg "https://github.com"`)
      expect(result._tag).toEqual("Success")
      expect(Result.getOrThrow(result).data.span).toEqual(
        SourceSpan.from(4, 20),
      )
    })
  })
})

describe("ValueTagged", () => {
  describe("primitive string", () => {
    const schema = KdlSchema.EntryArgument(
      0,
      KdlSchema.Value(Schema.String).pipe(KdlSchema.allowTagged),
    )
    const decode = KdlSchema.decodeSourceResult(schema)

    test("accepts string values", ({ expect }) => {
      const result = decode(`arg "john"`)
      expect(Result.getOrThrow(result).data.value).toEqual("john")
      expect(Result.getOrThrow(result).data.tagName).toBeUndefined()
    })

    test("accepts string values - span", ({ expect }) => {
      const result = decode(`arg "john"`)
      expect(result._tag).toEqual("Success")
      expect(Result.getOrThrow(result).data.span).toEqual(SourceSpan.from(4, 6))
      expect(Result.getOrThrow(result).data.tagSpan).toBeUndefined()
    })

    test("rejects any other value", ({ expect }) => {
      const rNumber = decode(`arg 10`)
      assert(rNumber._tag === "Failure")
      expect(rNumber.failure.toString()).toEqual("Expected string, got 10")
      const rBool = decode(`arg #true`)
      assert(rBool._tag === "Failure")
      expect(rBool.failure.toString()).toEqual("Expected string, got true")
      const rNull = decode(`arg #null`)
      assert(rNull._tag === "Failure")
      expect(rNull.failure.toString()).toEqual("Expected string, got null")
    })
  })

  describe("primitive number", () => {
    const schema = KdlSchema.EntryArgument(
      0,
      KdlSchema.Value(Schema.Number).pipe(KdlSchema.allowTagged),
    )
    const decode = KdlSchema.decodeSourceResult(schema)

    test.for([
      ["untagged", "42", undefined],
      ["tagged", "(person)42", "person"],
    ])("accepts number values (%s)", (testCase, { expect }) => {
      const input = testCase[1]
      const tagName = testCase[2]
      const result = decode(`arg ${input}`)
      expect(Result.getOrThrow(result).data.value).toEqual(42)
      expect(Result.getOrThrow(result).data.tagName).toEqual(tagName)
    })

    test("accepts number values - span", ({ expect }) => {
      const result = decode(`arg (person)42`)
      expect(result._tag).toEqual("Success")
      expect(Result.getOrThrow(result).data.span).toEqual(
        SourceSpan.from(4, 10),
      )
      expect(Result.getOrThrow(result).data.tagSpan).toEqual(
        SourceSpan.from(4, 8),
      )
    })

    test("rejects any other value", ({ expect }) => {
      const rString = decode(`arg "john"`)
      assert(rString._tag === "Failure")
      expect(rString.failure.toString()).toEqual(`Expected number, got "john"`)
      const rBool = decode(`arg #true`)
      assert(rBool._tag === "Failure")
      expect(rBool.failure.toString()).toEqual("Expected number, got true")
      const rNull = decode(`arg #null`)
      assert(rNull._tag === "Failure")
      expect(rNull.failure.toString()).toEqual("Expected number, got null")
    })
  })

  describe("primitive boolean", () => {
    const schema = KdlSchema.EntryArgument(
      0,
      KdlSchema.Value(Schema.Boolean).pipe(KdlSchema.allowTagged),
    )
    const decode = KdlSchema.decodeSourceResult(schema)

    test("accepts boolean values", ({ expect }) => {
      const result = decode(`arg #true`)
      expect(Result.getOrThrow(result).data.value).toEqual(true)
      expect(Result.getOrThrow(result).data.tagName).toBeUndefined()
    })

    test("accepts boolean values - span", ({ expect }) => {
      const result = decode(`arg #true`)
      expect(result._tag).toEqual("Success")
      expect(Result.getOrThrow(result).data.span).toEqual(SourceSpan.from(4, 5))
      expect(Result.getOrThrow(result).data.tagSpan).toBeUndefined()
    })

    test("rejects any other value", ({ expect }) => {
      const rString = decode(`arg "doe"`)
      assert(rString._tag === "Failure")
      expect(rString.failure.toString()).toEqual(`Expected boolean, got "doe"`)
      const rNumber = decode(`arg 67`)
      assert(rNumber._tag === "Failure")
      expect(rNumber.failure.toString()).toEqual("Expected boolean, got 67")
      const rNull = decode(`arg #null`)
      assert(rNull._tag === "Failure")
      expect(rNull.failure.toString()).toEqual("Expected boolean, got null")
    })
  })
})

describe("EntryArgument", () => {
  const valueSchema = KdlSchema.Value(Schema.String)
  const schema = KdlSchema.EntryArgument(0, valueSchema)
  const decode = KdlSchema.decodeSourceResult(schema)

  test("accepts string argument at index", ({ expect }) => {
    const result = decode(`format "kdl"`)
    expect(Result.getOrThrow(result).index).toEqual(0)
    expect(Result.getOrThrow(result).data.value).toEqual("kdl")
  })

  test("accepts string argument at index - span", ({ expect }) => {
    const result = decode(`format "kdl"`)
    expect(result._tag).toEqual("Success")
    expect(Result.getOrThrow(result).data.span).toBeDefined()
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
    expect(Result.getOrThrow(result).name).toEqual("name")
    expect(Result.getOrThrow(result).data.value).toEqual("mylib")
  })

  test("accepts string property - span", ({ expect }) => {
    const result = decode(`bundle name="mylib"`)
    expect(result._tag).toEqual("Success")
    const value = Result.getOrThrow(result)
    expect(value.data.span?.offset).toEqual(12)
    expect(value.data.span?.length).toEqual(7)
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
    const kdlSpan = KdlSchema.resolveKdlSpan(r.failure)
    expect(kdlSpan).toBeDefined()
    expect(kdlSpan?.offset).toEqual(0)
    expect(kdlSpan?.length).toEqual(6)
  })

  test("rejects wrong type", ({ expect }) => {
    const r = decode(`bundle name=42`)
    assert(r._tag === "Failure")
    expect(r.failure.toString()).toEqual("Expected string, got 42")
    const kdlSpan = KdlSchema.resolveKdlSpan(r.failure)
    expect(kdlSpan).toBeDefined()
  })
})

describe("EntryProperty with ValueTagged", () => {
  describe("with String", () => {
    const valueSchema = KdlSchema.Value(Schema.String).pipe(
      KdlSchema.allowTagged,
    )
    const schema = KdlSchema.EntryProperty("name", valueSchema)
    const decode = KdlSchema.decodeSourceResult(schema)

    test("accepts property", ({ expect }) => {
      const result = decode(`bundle name="mylib"`)
      expect(Result.getOrThrow(result).name).toEqual("name")
      expect(Result.getOrThrow(result).data.value).toEqual("mylib")
      expect(Result.getOrThrow(result).data.tagName).toBeUndefined()
    })

    test("accepts property - span", ({ expect }) => {
      const result = decode(`bundle name="mylib"`)
      expect(result._tag).toEqual("Success")
      const value = Result.getOrThrow(result)
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
      expect(Result.getOrThrow(result).name).toEqual("url")
      expect(Result.getOrThrow(result).data.value).toEqual(
        new URL("https://github.com"),
      )
      expect(Result.getOrThrow(result).data.tagName).toBeUndefined()
    })

    test("accepts URL property - span", ({ expect }) => {
      const result = decode(`bundle url="https://github.com"`)
      expect(result._tag).toEqual("Success")
      expect(Result.getOrThrow(result).data.span).toBeDefined()
    })
  })
})
