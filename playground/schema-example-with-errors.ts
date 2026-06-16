/**
 * 示例：展示类型检查如何工作（这些代码会报类型错误）
 */

import { generateSchema } from '../src/utils/schema'

// 定义接口
interface BlogPostFrontmatter {
  title: string
  date: string | Date
  tags?: string[]
  author?: string
  published: boolean
}

// ✅ 正确的配置
const correctSchema = generateSchema<BlogPostFrontmatter>({
  title: { type: 'string', required: true },
  date: { type: 'date', required: true },
  tags: { type: 'array', required: false },
  author: { type: 'string', required: false },
  published: { type: 'boolean', required: true },
})

// ❌ 以下配置会报类型错误（取消注释查看错误）

// 错误 1: 字段类型不匹配
// const error1 = generateSchema<BlogPostFrontmatter>({
//   title: { type: 'number', required: true }, // ❌ 'number' 不能赋值给 'string' | 'date'
// })

// 错误 2: required 属性不匹配（可选字段不能设为 required: true）
// const error2 = generateSchema<BlogPostFrontmatter>({
//   tags: { type: 'array', required: true }, // ❌ 可选字段不能设为 required: true
// })

// 错误 3: 必需字段不能设为 required: false
// const error3 = generateSchema<BlogPostFrontmatter>({
//   title: { type: 'string', required: false }, // ❌ 必需字段不能设为 required: false
// })

// 错误 4: 不存在的字段
// const error4 = generateSchema<BlogPostFrontmatter>({
//   invalidField: { type: 'string', required: true }, // ❌ 字段不存在于接口中
// })

// 错误 5: 缺少必需字段
// const error5 = generateSchema<BlogPostFrontmatter>({
//   // title 字段缺失，但接口中 title 是必需的
//   date: { type: 'date', required: true },
// })

export { correctSchema }
