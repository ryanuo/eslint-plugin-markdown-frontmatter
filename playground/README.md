# 使用示例

## 基本用法

### 方式 1: 直接在配置中定义 schema

```js
// eslint.config.js
import frontmatter from 'eslint-plugin-markdown-frontmatter'

export default [
  {
    files: ['**/*.md'],
    processor: frontmatter.processors.markdown,
    plugins: {
      frontmatter,
    },
    rules: {
      'frontmatter/format': [
        'error',
        {
          schema: {
            title: {
              type: 'string',
              required: true,
            },
            date: {
              type: 'date',
              required: true,
            },
            tags: 'array', // 可选字段，简写形式
          },
        },
      ],
    },
  },
]
```

### 方式 2: 使用 TypeScript 类型定义

```ts
// schema.ts
import type { SchemaConfig } from 'eslint-plugin-markdown-frontmatter'
import { generateSchema } from 'eslint-plugin-markdown-frontmatter'

// 定义 TypeScript 接口
interface BlogPostFrontmatter {
  title: string
  date: string | Date
  tags?: string[]
  author?: string
  published: boolean
}

// 从类型生成 schema
export const blogPostSchema: SchemaConfig = generateSchema<BlogPostFrontmatter>({
  title: { type: 'string', required: true },
  date: { type: 'date', required: true },
  tags: { type: 'array', required: false },
  author: { type: 'string', required: false },
  published: { type: 'boolean', required: true },
})
```

```js
// eslint.config.js
import { blogPostSchema } from './schema.js'

export default [
  {
    files: ['**/*.md'],
    processor: frontmatter.processors.markdown,
    plugins: {
      frontmatter,
    },
    rules: {
      'frontmatter/format': ['error', { schema: blogPostSchema }],
    },
  },
]
```

### 方式 3: 使用简化的 createSchema

```ts
import { createSchema } from 'eslint-plugin-markdown-frontmatter'

const schema = createSchema({
  title: 'string',              // 必需字段
  date: 'date',                 // 必需字段
  tags: ['array', false],       // 可选字段
  author: ['string', false],    // 可选字段
  published: 'boolean',         // 必需字段
})
```

## 支持的字段类型

- `string` - 字符串
- `number` - 数字
- `boolean` - 布尔值
- `array` - 数组
- `object` - 对象
- `date` - 日期（支持 Date 对象或可解析的日期字符串）

## 配置选项

### 完整配置对象

```js
{
  fieldName: {
    type: 'string',    // 字段类型
    required: true,    // 是否必需（默认 false）
  }
}
```

### 简写形式

```js
{
  fieldName: 'string'  // 等同于 { type: 'string', required: false }
}
```

