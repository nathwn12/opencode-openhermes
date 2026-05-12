import { isPlainObject } from "./hardening.mjs"

const SUPPORTED_SCHEMA_KEYS = new Set([
  "type", "const", "enum", "format", "minimum", "maximum", "required",
  "properties", "items", "oneOf", "anyOf", "allOf", "not",
  "if", "then", "else",
  "pattern", "minLength", "maxLength",
  "minItems", "maxItems", "uniqueItems", "contains",
  "dependentRequired", "dependentSchemas", "propertyNames"
])
const SCHEMA_METADATA_KEYS = new Set(["$schema", "title", "description", "default"])
const RECURSION_LIMIT = 20

function matchesType(type, value) {
  if (type === "null") return value === null
  if (type === "array") return Array.isArray(value)
  if (type === "object") return isPlainObject(value)
  if (type === "integer") return Number.isInteger(value)
  if (type === "number") return typeof value === "number" && Number.isFinite(value)
  return typeof value === type
}

function validateNode(schema, value, at, errors, depth = 0, maxDepth = RECURSION_LIMIT) {
  if (!isPlainObject(schema) || value === undefined) return
  if (depth > maxDepth) { errors.push(`${at} exceeds max recursion depth`); return }

  if (Array.isArray(schema.oneOf)) {
    const matches = schema.oneOf.filter(sub => {
      const subErrors = []
      validateNode(sub, value, `${at}[oneOf]`, subErrors, depth + 1, maxDepth)
      return subErrors.length === 0
    })
    if (matches.length !== 1) errors.push(`${at} must match exactly one schema (matched ${matches.length})`)
  }
  if (Array.isArray(schema.anyOf)) {
    const anyMatch = schema.anyOf.some(sub => {
      const subErrors = []
      validateNode(sub, value, `${at}[anyOf]`, subErrors, depth + 1, maxDepth)
      return subErrors.length === 0
    })
    if (!anyMatch) errors.push(`${at} must match at least one schema`)
  }
  if (Array.isArray(schema.allOf)) {
    for (let i = 0; i < schema.allOf.length; i++) {
      validateNode(schema.allOf[i], value, `${at}[allOf/${i}]`, errors, depth + 1, maxDepth)
    }
  }
  if (isPlainObject(schema.not)) {
    const notErrors = []
    validateNode(schema.not, value, `${at}[not]`, notErrors, depth + 1, maxDepth)
    if (notErrors.length === 0) errors.push(`${at} must NOT match not schema`)
  }
  if (isPlainObject(schema.if)) {
    const ifErrors = []
    validateNode(schema.if, value, `${at}[if]`, ifErrors, depth + 1, maxDepth)
    if (ifErrors.length === 0) {
      if (isPlainObject(schema.then)) validateNode(schema.then, value, `${at}[then]`, errors, depth + 1, maxDepth)
    } else if (isPlainObject(schema.else)) {
      validateNode(schema.else, value, `${at}[else]`, errors, depth + 1, maxDepth)
    }
  }

  if (schema.const !== undefined && JSON.stringify(value) !== JSON.stringify(schema.const)) errors.push(`${at} must equal ${JSON.stringify(schema.const)}`)
  if (Array.isArray(schema.enum) && !schema.enum.some(option => JSON.stringify(option) === JSON.stringify(value))) errors.push(`${at} must be one of ${schema.enum.map(option => JSON.stringify(option)).join(", ")}`)

  const types = Array.isArray(schema.type) ? schema.type : (schema.type ? [schema.type] : [])
  if (types.length && !types.some(type => matchesType(type, value))) {
    errors.push(`${at} must be ${types.join(" or ")}`)
    return
  }

  if (typeof value === "string") {
    if (schema.format === "date-time" && Number.isNaN(Date.parse(value))) errors.push(`${at} must be a valid date-time string`)
    if (schema.pattern !== undefined) {
      try {
        const re = new RegExp(schema.pattern)
        if (!re.test(value)) errors.push(`${at} must match pattern ${schema.pattern}`)
      } catch {
        errors.push(`${at} has invalid regex: ${schema.pattern}`)
      }
    }
    if (schema.minLength !== undefined && [...value].length < schema.minLength) errors.push(`${at} must be at least ${schema.minLength} characters`)
    if (schema.maxLength !== undefined && [...value].length > schema.maxLength) errors.push(`${at} must be at most ${schema.maxLength} characters`)
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${at} must be >= ${schema.minimum}`)
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${at} must be <= ${schema.maximum}`)
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${at} must have at least ${schema.minItems} items`)
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${at} must have at most ${schema.maxItems} items`)
    if (schema.uniqueItems) {
      for (let i = 0; i < value.length; i++) {
        for (let j = i + 1; j < value.length; j++) {
          if (JSON.stringify(value[i]) === JSON.stringify(value[j])) { errors.push(`${at} must have unique items`); i = value.length; break }
        }
      }
    }
    if (isPlainObject(schema.contains)) {
      const hasMatch = value.some(item => {
        const subErrors = []
        validateNode(schema.contains, item, `${at}[contains]`, subErrors, depth + 1, maxDepth)
        return subErrors.length === 0
      })
      if (!hasMatch) errors.push(`${at} must contain at least one item matching contains schema`)
    }
    if (schema.items !== undefined) {
      if (Array.isArray(schema.items)) {
        value.forEach((item, index) => {
          if (index < schema.items.length) validateNode(schema.items[index], item, `${at}[${index}]`, errors, depth + 1, maxDepth)
        })
      } else {
        value.forEach((item, index) => validateNode(schema.items, item, `${at}[${index}]`, errors, depth + 1, maxDepth))
      }
    }
    return
  }

  if (isPlainObject(value)) {
    for (const key of Array.isArray(schema.required) ? schema.required : []) {
      if (value[key] === undefined) errors.push(`${at}.${key} is required`)
    }
    for (const [key, child] of Object.entries(isPlainObject(schema.properties) ? schema.properties : {})) {
      if (value[key] !== undefined) validateNode(child, value[key], `${at}.${key}`, errors, depth + 1, maxDepth)
    }
    if (isPlainObject(schema.dependentRequired)) {
      for (const [prop, deps] of Object.entries(schema.dependentRequired)) {
        if (value[prop] !== undefined && Array.isArray(deps)) {
          for (const dep of deps) {
            if (value[dep] === undefined) errors.push(`${at}.${dep} is required when ${prop} is present`)
          }
        }
      }
    }
    if (isPlainObject(schema.dependentSchemas)) {
      for (const [prop, depSchema] of Object.entries(schema.dependentSchemas)) {
        if (value[prop] !== undefined) validateNode(depSchema, value, `${at}[dependent/${prop}]`, errors, depth + 1, maxDepth)
      }
    }
    if (isPlainObject(schema.propertyNames)) {
      for (const key of Object.keys(value)) {
        validateNode(schema.propertyNames, key, `${at}.${key}`, errors, depth + 1, maxDepth)
      }
    }
  }
}

function validateSchema(schema, value, at = "$", maxDepth = RECURSION_LIMIT) {
  const errors = []
  validateNode(schema, value, at, errors, 0, maxDepth)
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
      if (Array.isArray(value)) value.forEach((item, i) => visitSchemaNode(item, `${at}.items[${i}]`, unsupported))
      else visitSchemaNode(value, `${at}.items`, unsupported)
      continue
    }
    if (key === "$defs" || key === "definitions") {
      if (isPlainObject(value)) for (const defName of Object.keys(value)) visitSchemaNode(value[defName], `${at}.${key}.${defName}`, unsupported)
      continue
    }
    if (key === "oneOf" || key === "anyOf" || key === "allOf") {
      if (Array.isArray(value)) value.forEach((item, i) => visitSchemaNode(item, `${at}.${key}[${i}]`, unsupported))
      continue
    }
    if (key === "not" || key === "if" || key === "then" || key === "else" || key === "contains" || key === "propertyNames") {
      visitSchemaNode(value, `${at}.${key}`, unsupported)
      continue
    }
    if (key === "dependentSchemas") {
      if (isPlainObject(value)) for (const [prop, depSchema] of Object.entries(value)) visitSchemaNode(depSchema, `${at}.dependentSchemas.${prop}`, unsupported)
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
