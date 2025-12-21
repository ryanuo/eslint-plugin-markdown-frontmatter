/**
 * Frontmatter 字段类型验证工具函数
 */

import type { FieldType } from './schema'

/**
 * 获取值的实际类型
 */
export function getFieldType(value: unknown): FieldType | null {
  if (value === null || value === undefined)
    return null

  if (Array.isArray(value))
    return 'array'

  if (value instanceof Date)
    return 'date'

  const jsType = typeof value
  if (jsType === 'string' || jsType === 'number' || jsType === 'boolean' || jsType === 'object')
    return jsType

  return null
}

/**
 * 验证值是否符合预期的字段类型
 */
export function validateType(value: unknown, expectedType: FieldType): boolean {
  const actualType = getFieldType(value)

  if (actualType === null)
    return false

  // 日期类型特殊处理：支持 Date 对象和可解析的日期字符串
  if (expectedType === 'date') {
    return actualType === 'date' || (actualType === 'string' && !Number.isNaN(Date.parse(value as string)))
  }

  return actualType === expectedType
}
