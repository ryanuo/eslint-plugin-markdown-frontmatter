import type { ESLint } from 'eslint'
import format from './rules/format'

// 导出工具函数和类型，方便用户从 TypeScript 类型生成 schema
export {
  createSchema,
  type FieldSchema,
  type FieldType,
  generateSchema,
  type SchemaConfig,
} from './utils/schema'

const plugin: ESLint.Plugin = {
  rules: {
    format,
  },
}

export default plugin
