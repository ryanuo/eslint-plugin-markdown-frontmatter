/**
 * 类型检查演示：展示 TypeScript 如何在配置错误时显示类型错误（爆红）
 */

import { generateSchema } from '../src/utils/schema'

// 定义接口
interface BlogPostFrontmatter {
  title: string           // 必需字段
  date: string | Date     // 必需字段
  tags?: string[]         // 可选字段
  author?: string         // 可选字段
  published: boolean      // 必需字段
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

// ❌ 以下配置会在 IDE 中会显示类型错误（爆红）

// 错误示例 1: 字段类型不匹配
// const error1 = generateSchema<BlogPostFrontmatter>({
//   title: { type: 'number', required: true }, // ❌ Type 'number' is not assignable to type 'string' | 'date'
// })

// 错误示例 2: 可选字段不能设为 required: true
// const error2 = generateSchema<BlogPostFrontmatter>({
//   tags: { type: 'array', required: true }, // ❌ Type 'true' is not assignable to type 'false'
// })

// 错误示例 3: 不存在的字段
// const error3 = generateSchema<BlogPostFrontmatter>({
//   invalidField: { type: 'string', required: true }, // ❌ Property 'invalidField' does not exist
// })

// 错误示例 4: 缺少必需字段（如果使用 Partial，则不会报错）
// const error4 = generateSchema<BlogPostFrontmatter>({
//   // title 字段缺失，但接口中 title 是必需的
//   date: { type: 'date', required: true },
// })

export { correctSchema, correctSchemaShort }

