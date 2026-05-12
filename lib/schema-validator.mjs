import { isPlainObject } from "./hardening.mjs"

const SUPPORTED_SCHEMA_KEYS = new Set(["type", "const", "enum", "format", "minimum", "maximum", "required", "properties", "items"])
const SCHEMA_METADATA_KEYS = new Set(["$schema", "title", "description", "default"])

function matchesType(type, value) {
  if (type === "null") return value === null
  if (type === "array") return Array.isArray(value)
  if (type === "object") return isPlainObject(value)
  if (type === "integer") return Number.isInteger(value)
  if (type === "number") return typeof value === "number" && Number.isFinite(value)
  return typeof value === type
}

function validateNode(schema, value, at, errors) {
  if (!isPlainObject(schema) || value === undefined) return
  if (schema.const !== undefined && JSON.stringify(value) !== JSON.stringify(schema.const)) errors.push(`${at} must equal ${JSON.stringify(schema.const)}`)
  if (Array.isArray(schema.enum) && !schema.enum.some(option => JSON.stringify(option) === JSON.stringify(value))) errors.push(`${at} must be one of ${schema.enum.map(option => JSON.stringify(option)).join(", ")}`)

  const types = Array.isArray(schema.type) ? schema.type : (schema.type ? [schema.type] : [])
  if (types.length && !types.some(type => matchesType(type, value))) {
    errors.push(`${at} must be ${types.join(" or ")}`)
    return
  }

  if (typeof value === "string" && schema.format === "date-time" && Number.isNaN(Date.parse(value))) errors.push(`${at} must be a valid date-time string`)
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${at} must be >= ${schema.minimum}`)
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${at} must be <= ${schema.maximum}`)
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => validateNode(schema.items, item, `${at}[${index}]`, errors))
    return
  }

  if (isPlainObject(value)) {
    for (const key of Array.isArray(schema.required) ? schema.required : []) {
      if (value[key] === undefined) errors.push(`${at}.${key} is required`)
    }
    for (const [key, child] of Object.entries(isPlainObject(schema.properties) ? schema.properties : {})) {
      if (value[key] !== undefined) validateNode(child, value[key], `${at}.${key}`, errors)
    }
  }
}

function validateSchema(schema, value, at = "$") {
  const errors = []
  validateNode(schema, value, at, errors)
  return errors
}

function visitSchemaNode(schema, at, unsupported) {
  if (!isPlainObject(schema)) return
  for (const [key, value] of Object.entries(schema)) {
    if (key === "properties") {
      if (!isPlainObject(value)) unsupported.push(`${at}.properties must be an object`)
      else for (const [propertyName, propertySchema] of Object.entries(value)) visitSchemaNode(propertySchema, `${at}.properties.${propertyName}`, unsupported)
      continue
    }
    if (key === "items") {
      visitSchemaNode(value, `${at}.items`, unsupported)
      continue
    }
    if (key === "$defs" || key === "definitions") {
      if (isPlainObject(value)) for (const defName of Object.keys(value)) visitSchemaNode(value[defName], `${at}.${key}.${defName}`, unsupported)
      continue
    }
    if (!SUPPORTED_SCHEMA_KEYS.has(key) && !SCHEMA_METADATA_KEYS.has(key)) unsupported.push(`${at} uses unsupported schema keyword "${key}"`)
  }
}

function findUnsupportedSchemaKeywords(schema) {
  const unsupported = []
  visitSchemaNode(schema, "$", unsupported)
  return unsupported
}

export { findUnsupportedSchemaKeywords, isPlainObject, validateSchema }
