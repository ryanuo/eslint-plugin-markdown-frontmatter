import type { ESLint } from 'eslint'
import format from './rules/format'

export { fromInterface, type FromInterfaceOptions } from './utils/from-interface'
export {
  fromJsonSchema,
  type FromJsonSchemaOptions,
  type JsonSchema,
} from './utils/from-json-schema'
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
