/**
 * 示例：如何从 TypeScript 类型定义生成 ESLint schema 配置
 */

import type { SchemaConfig } from '../src/utils/schema'
import { createSchema, generateSchema } from '../src/utils/schema'

// 方式 1: 定义 TypeScript 接口
interface BlogPostFrontmatter {
  title: string
  date: string | Date
  tags?: string[]
  author?: string
  published: boolean
}

// 方式 2: 使用 generateSchema 从类型生成配置
// 注意：对于可选字段（如 tags?, author?），required 必须是 false
// 对于必需字段，required 可以是 true 或 false
const blogPostSchema: SchemaConfig = generateSchema<BlogPostFrontmatter>({
  title: { type: 'string', required: true },
  date: { type: 'date', required: true },
  tags: { type: 'array', required: false }, // tags? 是可选字段，必须 required: false
  author: { type: 'string', required: false }, // author? 是可选字段，必须 required: false
  published: { type: 'boolean', required: true },
})

// 方式 3: 使用简化的 createSchema
const simpleSchema = createSchema({
  title: 'string',              // 必需字段
  date: 'date',                 // 必需字段
  tags: ['array', false],       // 可选字段
  author: ['string', false],    // 可选字段
  published: 'boolean',          // 必需字段
})

// 在 ESLint 配置中使用
export const eslintConfig = {
  rules: {
    'frontmatter/format': [
      'error',
      {
        schema: blogPostSchema, // 或 simpleSchema
      },
    ],
  },
}

