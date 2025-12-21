/**
 * 从 TypeScript 类型定义生成 ESLint 规则 schema 的工具函数
 */

type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date'

export interface FieldSchema {
  type: FieldType
  required?: boolean
}

export interface SchemaConfig {
  [key: string]: FieldSchema | FieldType
}

/**
 * 将 TypeScript 类型映射到 FieldType
 * 使用简化的类型映射，提升类型检查响应速度
 * 优化：减少条件类型嵌套，使用更直接的类型判断
 */
type TypeToFieldType<T> =
  // 使用联合类型而不是嵌套条件，提升类型检查速度
  T extends Date
    ? 'date'
    : T extends string
      ? 'string' | 'date'
      : T extends number
        ? 'number'
        : T extends boolean
          ? 'boolean'
          : T extends readonly any[] | any[]
            ? 'array'
            : T extends Record<string, any>
              ? 'object'
              : FieldType

/**
 * Schema 配置项类型
 * 提供类型检查，确保字段类型匹配
 * required 属性可以是 boolean（允许灵活配置）
 */
type SchemaFieldConfig<T>
  = | {
    type: TypeToFieldType<T>
    required?: boolean
  }
  | TypeToFieldType<T>

/**
 * 从 TypeScript 接口定义生成 schema 配置
 * 提供严格的类型检查，确保配置的字段类型与 TypeScript 接口匹配
 *
 * 类型检查功能：
 * 1. ✅ 检查字段是否存在（不存在的字段会报错）
 * 2. ✅ 检查字段类型是否匹配（类型不匹配会报错）
 * 3. ⚠️ required 属性可选，允许灵活配置
 *
 * @example
 * ```ts
 * interface Frontmatter {
 *   title: string      // 必需字段
 *   date?: string      // 可选字段
 *   tags?: string[]     // 可选数组
 * }
 *
 * const schema = generateSchema<Frontmatter>({
 *   title: { type: 'string', required: true },   // ✅ 类型匹配
 *   date: { type: 'date', required: false },    // ✅ 类型匹配
 *   tags: { type: 'array', required: false },   // ✅ 类型匹配
 *   // invalid: { type: 'number', required: true },  // ❌ 类型错误，会报红
 *   // nonexistent: { type: 'string', required: true }, // ❌ 字段不存在，会报红
 * })
 * ```
 */
export function generateSchema<T extends Record<string, any>>(
  config: {
    [K in keyof T]: T[K] extends undefined
      ? never
      : SchemaFieldConfig<T[K]>
  },
): SchemaConfig {
  return config as SchemaConfig
}

/**
 * 简化版：从字段名和类型快速生成 schema
 *
 * @example
 * ```ts
 * const schema = createSchema({
 *   title: 'string',      // 必需字段（默认）
 *   date: 'date',         // 必需字段
 *   tags: ['array'],      // 可选字段
 * })
 * ```
 */
export function createSchema(
  fields: Record<string, FieldType | [FieldType, boolean?]>,
): SchemaConfig {
  const schema: SchemaConfig = {}

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (Array.isArray(fieldDef)) {
      const [type, required = false] = fieldDef
      schema[fieldName] = { type, required }
    }
    else {
      // 默认必需字段
      schema[fieldName] = { type: fieldDef, required: true }
    }
  }

  return schema
}
