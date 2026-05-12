import { describe, it } from "node:test"
import assert from "node:assert/strict"

const { validateSchema, findUnsupportedSchemaKeywords } = await import("../../lib/schema-validator.mjs")

describe("validateSchema", () => {
  it("passes valid object", () => {
    const schema = {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"]
    }
    const errors = validateSchema(schema, { name: "test" })
    assert.equal(errors.length, 0)
  })
  it("reports missing required field", () => {
    const schema = {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"]
    }
    const errors = validateSchema(schema, {})
    assert.ok(errors.length > 0)
    assert.ok(errors[0].includes("name"))
  })
  it("validates string type", () => {
    const schema = { type: "string" }
    assert.equal(validateSchema(schema, "hello").length, 0)
    assert.ok(validateSchema(schema, 42).length > 0)
  })
  it("validates number type", () => {
    const schema = { type: "number" }
    assert.equal(validateSchema(schema, 3.14).length, 0)
    assert.ok(validateSchema(schema, "hello").length > 0)
  })
  it("validates integer type", () => {
    const schema = { type: "integer" }
    assert.equal(validateSchema(schema, 42).length, 0)
    assert.ok(validateSchema(schema, 3.14).length > 0)
  })
  it("validates array type", () => {
    const schema = { type: "array", items: { type: "string" } }
    assert.equal(validateSchema(schema, ["a", "b"]).length, 0)
    assert.ok(validateSchema(schema, "not-array").length > 0)
  })
  it("validates const values", () => {
    const schema = { const: "active" }
    assert.equal(validateSchema(schema, "active").length, 0)
    assert.ok(validateSchema(schema, "inactive").length > 0)
  })
  it("validates enum values", () => {
    const schema = { enum: ["low", "medium", "high"] }
    assert.equal(validateSchema(schema, "medium").length, 0)
    assert.ok(validateSchema(schema, "critical").length > 0)
  })
  it("validates minimum/maximum", () => {
    const schema = { type: "number", minimum: 0, maximum: 100 }
    assert.equal(validateSchema(schema, 50).length, 0)
    assert.ok(validateSchema(schema, -1).length > 0)
    assert.ok(validateSchema(schema, 101).length > 0)
  })
  it("validates date-time format", () => {
    const schema = { type: "string", format: "date-time" }
    assert.equal(validateSchema(schema, "2026-05-10T00:00:00Z").length, 0)
    assert.ok(validateSchema(schema, "not-a-date").length > 0)
  })
  it("validates nested object properties", () => {
    const schema = {
      type: "object",
      properties: {
        meta: {
          type: "object",
          properties: { version: { type: "number" } },
          required: ["version"]
        }
      },
      required: ["meta"]
    }
    assert.equal(validateSchema(schema, { meta: { version: 2 } }).length, 0)
    assert.ok(validateSchema(schema, { meta: {} }).length > 0)
  })

  it("oneOf — exactly one match passes", () => {
    const schema = { oneOf: [{ type: "string" }, { type: "number" }] }
    assert.equal(validateSchema(schema, "hello").length, 0)
    assert.equal(validateSchema(schema, 42).length, 0)
    assert.ok(validateSchema(schema, true).length > 0)
  })
  it("oneOf — exactly one match fails when multiple match", () => {
    const schema = { oneOf: [{ type: "string" }, { const: "hello" }] }
    assert.ok(validateSchema(schema, "hello").length > 0)
  })
  it("anyOf — at least one matches", () => {
    const schema = { anyOf: [{ type: "string" }, { type: "number" }] }
    assert.equal(validateSchema(schema, "hello").length, 0)
    assert.ok(validateSchema(schema, true).length > 0)
  })
  it("allOf — all must match", () => {
    const schema = { allOf: [{ type: "number" }, { minimum: 0 }] }
    assert.equal(validateSchema(schema, 5).length, 0)
    assert.ok(validateSchema(schema, -5).length > 0)
    assert.ok(validateSchema(schema, "hello").length > 0)
  })
  it("not — must NOT match", () => {
    const schema = { not: { type: "string" } }
    assert.equal(validateSchema(schema, 42).length, 0)
    assert.ok(validateSchema(schema, "hello").length > 0)
  })
  it("if/then/else — conditional", () => {
    const schema = {
      if: { properties: { x: { const: true } } },
      then: { required: ["y"] },
      else: { properties: { z: { type: "string" } } }
    }
    assert.equal(validateSchema(schema, { x: true, y: 1 }).length, 0)
    assert.ok(validateSchema(schema, { x: true }).length > 0)
    assert.equal(validateSchema(schema, { x: false, z: "a" }).length, 0)
    assert.ok(validateSchema(schema, { x: false, z: 42 }).length > 0)
  })
  it("pattern — regex on strings", () => {
    const schema = { pattern: "^[a-z]+$" }
    assert.equal(validateSchema(schema, "hello").length, 0)
    assert.ok(validateSchema(schema, "Hello").length > 0)
    assert.equal(validateSchema(schema, 42).length, 0)
  })
  it("minLength/maxLength", () => {
    const schema = { type: "string", minLength: 1, maxLength: 5 }
    assert.equal(validateSchema(schema, "hi").length, 0)
    assert.ok(validateSchema(schema, "").length > 0)
    assert.ok(validateSchema(schema, "hello!!").length > 0)
  })
  it("minItems/maxItems", () => {
    const schema = { type: "array", items: { type: "number" }, minItems: 1, maxItems: 3 }
    assert.equal(validateSchema(schema, [1]).length, 0)
    assert.ok(validateSchema(schema, []).length > 0)
    assert.ok(validateSchema(schema, [1, 2, 3, 4]).length > 0)
  })
  it("uniqueItems", () => {
    const schema = { type: "array", items: { type: "number" }, uniqueItems: true }
    assert.equal(validateSchema(schema, [1, 2, 3]).length, 0)
    assert.ok(validateSchema(schema, [1, 1, 2]).length > 0)
  })
  it("contains", () => {
    const schema = { type: "array", contains: { type: "number" } }
    assert.equal(validateSchema(schema, [1, "a"]).length, 0)
    assert.ok(validateSchema(schema, ["a", "b"]).length > 0)
  })
  it("dependentRequired", () => {
    const schema = {
      type: "object",
      properties: { a: {}, b: {} },
      dependentRequired: { a: ["b"] }
    }
    assert.equal(validateSchema(schema, { a: 1, b: 2 }).length, 0)
    assert.ok(validateSchema(schema, { a: 1 }).length > 0)
  })
  it("propertyNames", () => {
    const schema = { type: "object", propertyNames: { pattern: "^[a-z]+$" } }
    assert.equal(validateSchema(schema, { hello: 1 }).length, 0)
    assert.ok(validateSchema(schema, { HELLO: 1 }).length > 0)
  })
  it("depth limit prevents stack overflow", () => {
    function nest(s) { return { allOf: [s] } }
    let deepSchema = { type: "string" }
    for (let i = 0; i < 21; i++) deepSchema = nest(deepSchema)
    const errors = validateSchema(deepSchema, "hello")
    assert.ok(errors.length > 0)
    assert.ok(errors[0].includes("max recursion depth"))
  })
})

describe("findUnsupportedSchemaKeywords", () => {
  it("returns empty for supported schema", () => {
    const schema = { type: "object", properties: { x: { type: "string" } }, required: ["x"] }
    assert.equal(findUnsupportedSchemaKeywords(schema).length, 0)
  })
  it("detects unsupported keywords", () => {
    const schema = { type: "object", patternProperties: { "^x": {} } }
    const result = findUnsupportedSchemaKeywords(schema)
    assert.ok(result.length > 0)
    assert.ok(result[0].includes("patternProperties"))
  })
  it("handles nested unsupported keywords", () => {
    const schema = {
      type: "object",
      properties: {
        items: { type: "string", patternProperties: { "^x": { type: "number" } } }
      }
    }
    const result = findUnsupportedSchemaKeywords(schema)
    assert.ok(result.length > 0)
  })
  it("does not flag new keywords", () => {
    const schema = {
      oneOf: [], anyOf: [], allOf: [], not: {},
      if: {}, then: {}, else: {},
      pattern: "^x", minLength: 0, maxLength: 10,
      minItems: 0, maxItems: 10, uniqueItems: false, contains: {},
      dependentRequired: {}, dependentSchemas: {}, propertyNames: {}
    }
    const result = findUnsupportedSchemaKeywords(schema)
    assert.equal(result.length, 0)
  })
})
