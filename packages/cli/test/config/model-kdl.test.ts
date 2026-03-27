import { Value as ModelValue } from "@bgotink/kdl"
import { Result, Schema } from "effect"
import { assert, describe } from "vitest"
import { decodeSourceResult, Value } from "~/config/model-kdl.js"
import { SourceSpan } from "~/miette.js"
import { test } from "~test/fixtures.js"

describe("Value", () => {
  describe("primitive string", () => {
    const inner = Schema.String
    const schema = Value(inner)
    const decode = decodeSourceResult(schema)

    test("accepts string values", ({ expect }) => {
      const result = decode(`"john"`)
      expect(Result.getOrThrow(result)).toEqual({
        value: "john",
        tag: null,
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
    const schema = Value(inner)
    const decode = Schema.decodeUnknownResult(schema)

    test("accepts number values", ({ expect }) => {
      const result = decode(new ModelValue(42))
      expect(Result.getOrThrow(result)).toEqual({
        value: 42,
        tag: null,
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
    const schema = Value(inner)
    const decode = Schema.decodeUnknownResult(schema)

    test("accepts boolean values", ({ expect }) => {
      const result = decode(new ModelValue(true))
      expect(Result.getOrThrow(result)).toEqual({
        value: true,
        tag: null,
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
    const schema = Value(inner)
    const decode = Schema.decodeUnknownResult(schema)

    test("accepts strings", ({ expect }) => {
      const result = decode(new ModelValue("https://github.com"))
      const value = Result.getOrThrow(result)
      expect(value).toEqual({
        value: new URL("https://github.com"),
        tag: null,
        span: undefined,
      })
    })
  })
})
