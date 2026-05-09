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
        items: { type: "array", items: { type: "string", pattern: "^x" } }
      }
    }
    const result = findUnsupportedSchemaKeywords(schema)
    assert.ok(result.length > 0)
  })
})
