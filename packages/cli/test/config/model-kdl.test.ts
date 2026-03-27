import { Value } from "@bgotink/kdl"
import { Result, Schema } from "effect"
import { assert, describe } from "vitest"
import {
  KdlBoolean,
  KdlNumber,
  KdlString,
  KdlValue,
} from "~/config/model-kdl.js"
import { test } from "~test/fixtures.js"

describe("KdlValue", () => {
  const schema = Schema.Struct({
    name: KdlValue,
    age: KdlValue,
    isAlive: KdlValue,
  })
  const serializer = Schema.toCodecJson(schema)
  const encode = Schema.encodeSync(serializer)
  test("is really lean, can accept any Primitive", ({ expect }) => {
    const wronged = encode({
      age: new Value("john"),
      name: new Value(true),
      isAlive: new Value(69),
    })

    expect(wronged).toEqual({
      age: {
        value: "john",
        tag: null,
        span: null,
      },
      name: {
        value: true,
        tag: null,
        span: null,
      },
      isAlive: {
        value: 69,
        tag: null,
        span: null,
      },
    })
  })
})

describe("KdlString", () => {
  const schema = KdlString
  const serializer = Schema.toCodecJson(schema)
  const encode = Schema.encodeResult(serializer)

  test("accepts string values", ({ expect }) => {
    const result = encode(new Value("john"))
    expect(Result.getOrThrow(result)).toEqual({
      value: "john",
      tag: null,
      span: null,
    })
  })

  test("rejects any other value", ({ expect }) => {
    const rNumber = encode(new Value(10))
    assert(rNumber._tag === "Failure")
    expect(rNumber.failure.toString()).toEqual("Expected string, got number")
    const rBool = encode(new Value(true))
    assert(rBool._tag === "Failure")
    expect(rBool.failure.toString()).toEqual("Expected string, got boolean")
    const rNull = encode(new Value(null))
    assert(rNull._tag === "Failure")
    expect(rNull.failure.toString()).toEqual("Expected string, got null")
  })
})

describe("KdlNumber", () => {
  const schema = KdlNumber
  const serializer = Schema.toCodecJson(schema)
  const encode = Schema.encodeResult(serializer)

  test("accepts number values", ({ expect }) => {
    const result = encode(new Value(42))
    expect(Result.getOrThrow(result)).toEqual({
      value: 42,
      tag: null,
      span: null,
    })
  })

  test("rejects any other value", ({ expect }) => {
    const rString = encode(new Value("john"))
    assert(rString._tag === "Failure")
    expect(rString.failure.toString()).toEqual("Expected number, got string")
    const rBool = encode(new Value(true))
    assert(rBool._tag === "Failure")
    expect(rBool.failure.toString()).toEqual("Expected number, got boolean")
    const rNull = encode(new Value(null))
    assert(rNull._tag === "Failure")
    expect(rNull.failure.toString()).toEqual("Expected number, got null")
  })
})

describe("KdlBoolean", () => {
  const schema = KdlBoolean
  const serializer = Schema.toCodecJson(schema)
  const encode = Schema.encodeResult(serializer)

  test("accepts boolean values", ({ expect }) => {
    const result = encode(new Value(true))
    expect(Result.getOrThrow(result)).toEqual({
      value: true,
      tag: null,
      span: null,
    })
  })

  test("rejects any other value", ({ expect }) => {
    const rString = encode(new Value("john"))
    assert(rString._tag === "Failure")
    expect(rString.failure.toString()).toEqual("Expected boolean, got string")
    const rNumber = encode(new Value(123))
    assert(rNumber._tag === "Failure")
    expect(rNumber.failure.toString()).toEqual("Expected boolean, got number")
    const rNull = encode(new Value(null))
    assert(rNull._tag === "Failure")
    expect(rNull.failure.toString()).toEqual("Expected boolean, got null")
  })
})
