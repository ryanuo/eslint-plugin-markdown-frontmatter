/**
 * 类型检查示例：展示 TypeScript 类型检查如何工作
 *
 * 在 IDE 中，以下错误配置会显示红色波浪线（爆红）
 */

import { generateSchema } from '../src/utils/schema'

// 定义接口
interface BlogPostFrontmatter {
  title: string // 必需字段
  date: string | Date // 必需字段（联合类型）
  tags?: string[] // 可选字段
  author?: string // 可选字段
  published: boolean // 必需字段
}

// ✅ 正确的配置 - 不会报错
const correctSchema = generateSchema<BlogPostFrontmatter>({
  title: { type: 'string', required: true },
  date: { type: 'date', required: true },
  tags: { type: 'array', required: false },
  author: { type: 'string', required: false },
  published: { type: 'boolean', required: true },
})

// ✅ 也可以使用简写形式
const correctSchemaShort = generateSchema<BlogPostFrontmatter>({
  title: 'string',
  date: 'date',
  tags: 'array',
  author: 'string',
  published: 'boolean',
})

// ❌ 以下配置会在 IDE 中显示类型错误（爆红）
// 取消注释查看错误

// 错误 1: 字段类型不匹配
// const error1 = generateSchema<BlogPostFrontmatter>({
//   title: { type: 'number', required: true },
//   // ❌ Type 'number' is not assignable to type 'string' | 'date'
// })

// 错误 2: 不存在的字段
// const error2 = generateSchema<BlogPostFrontmatter>({
//   invalidField: { type: 'string', required: true },
//   // ❌ Property 'invalidField' does not exist in type...
// })

// 错误 3: 类型完全不匹配
// const error3 = generateSchema<BlogPostFrontmatter>({
//   published: { type: 'string', required: true },
//   // ❌ Type 'string' is not assignable to type 'boolean'
// })

export { correctSchema, correctSchemaShort }
