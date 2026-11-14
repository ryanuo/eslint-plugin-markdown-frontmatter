import type { FieldType, SchemaConfig } from './schema'

/**
 * JSON Schema 的最小子集（draft-07 / 2020-12 常见写法都能覆盖）。
 * 不需要完整实现，只要足以还原"字段 → 类型 + 是否必填"。
 */
export interface JsonSchema {
  $ref?: string
  type?: string | string[]
  properties?: Record<string, JsonSchema>
  required?: string[]
  items?: JsonSchema
  definitions?: Record<string, JsonSchema>
  $defs?: Record<string, JsonSchema>
  anyOf?: JsonSchema[]
  oneOf?: JsonSchema[]
  allOf?: JsonSchema[]
  enum?: unknown[]
  format?: string
  const?: unknown
  [key: string]: unknown
}

export interface FromJsonSchemaOptions {
  /** 覆盖或追加字段，优先级最高（如把 `format: date` 缺失的 `date` 字段当日期） */
  overrides?: SchemaConfig
}

/** 解析 `#/definitions/X`、`#/$defs/X` 形式的本地引用 */
function resolveRef(node: JsonSchema, root: JsonSchema, depth = 0): JsonSchema {
  if (!node.$ref || depth > 8)
    return node

  const ref = node.$ref
  const isDefs = ref.startsWith('#/$defs/')
  const name = ref.slice(isDefs ? '#/$defs/'.length : '#/definitions/'.length)
  const bucket = isDefs ? root.$defs : root.definitions
  const target = bucket?.[name]

  return target ? resolveRef(target, root, depth + 1) : node
}

function toFieldType(node: JsonSchema, root: JsonSchema): FieldType | null {
  const resolved = resolveRef(node, root)

  // `format: date` / `date-time` 优先于 string
  if (resolved.format === 'date' || resolved.format === 'date-time')
    return 'date'

  const type = Array.isArray(resolved.type) ? resolved.type[0] : resolved.type

  switch (type) {
    case 'string':
      return 'string'
    case 'number':
    case 'integer':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'array':
      return 'array'
    case 'object':
      return 'object'
  }

  // 没有显式 type 时按结构推断
  if (resolved.properties)
    return 'object'
  if (resolved.items)
    return 'array'
  if (resolved.enum || resolved.const !== undefined)
    return 'string'

  const variants = resolved.anyOf ?? resolved.oneOf
  if (variants) {
    for (const variant of variants) {
      const mapped = toFieldType(variant, root)
      if (mapped)
        return mapped
    }
  }

  if (resolved.allOf) {
    for (const variant of resolved.allOf) {
      const mapped = toFieldType(variant, root)
      if (mapped)
        return mapped
    }
  }

  return null
}

/**
 * 把标准 JSON Schema 转成规则需要的 schema。
 *
 * 这样就不必绑定某一个"TypeScript 类型 → 配置"的实现：
 *
 * - `ts-json-schema-generator`（TS 接口 → JSON Schema）
 * - `zod` 的 `z.toJSONSchema()` / `zod-to-json-schema`
 * - `typebox`、`json-schema-to-typescript` 反向链路
 * - 或者手写一份 `schema.json`
 *
 * @example
 * ```js
 * import { fromJsonSchema } from 'eslint-plugin-markdown-frontmatter'
 * import schema from './frontmatter.schema.json' with { type: 'json' }
 *
 * const frontmatterSchema = fromJsonSchema(schema)
 * ```
 */
export function fromJsonSchema(
  schema: JsonSchema,
  options: FromJsonSchemaOptions = {},
): SchemaConfig {
  const root = resolveRef(schema, schema)
  const properties = root.properties

  if (!properties) {
    throw new Error(
      '[markdown-frontmatter] 传入的 JSON Schema 没有 `properties`，'
      + '需要一个 object 类型的 schema（顶层可以是 `{ $ref: ... }`，但最终要指向带 properties 的定义）。',
    )
  }

  const required = new Set(root.required ?? [])
  const result: SchemaConfig = {}

  for (const [field, node] of Object.entries(properties)) {
    const type = toFieldType(node, schema)

    if (!type) {
      throw new Error(
        `[markdown-frontmatter] 字段 \`${field}\` 的 JSON Schema 无法映射（${JSON.stringify(node)}）。`
        + ` 请用 overrides 显式指定，例如：\`{ ${field}: 'string' }\`。`,
      )
    }

    result[field] = { required: required.has(field), type }
  }

  return { ...result, ...options.overrides }
}
