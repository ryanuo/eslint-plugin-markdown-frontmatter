import type { Rule } from 'eslint'
import type { FieldSchema, SchemaConfig } from '../utils/schema'
import { readFileSync } from 'node:fs'
import matter from 'gray-matter'
import { getFieldType, validateType } from '../utils/validate'

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate markdown frontmatter against a schema',
    },
    schema: [
      {
        type: 'object',
        properties: {
          schema: {
            type: 'object',
            additionalProperties: {
              oneOf: [
                { type: 'string', enum: ['string', 'number', 'boolean', 'array', 'object', 'date'] },
                {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['string', 'number', 'boolean', 'array', 'object', 'date'] },
                    required: { type: 'boolean' },
                  },
                  required: ['type'],
                  additionalProperties: false,
                },
              ],
            },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingField: 'Frontmatter must contain a `{{field}}` field',
      invalidType: 'Field `{{field}}` must be of type `{{expectedType}}`, but got `{{actualType}}`',
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const schemaConfig = (options.schema as SchemaConfig) || {}

    // 如果没有配置 schema，使用默认的 title 字段（向后兼容）
    const hasSchema = Object.keys(schemaConfig).length > 0
    const defaultSchema: SchemaConfig = hasSchema ? {} : { title: { type: 'string', required: true } }
    const finalSchema = hasSchema ? schemaConfig : defaultSchema

    return {
      Program() {
        // 获取原始 markdown 文件路径
        // 使用 getPhysicalFilename() 获取原始文件路径，而不是处理器修改后的路径
        const filename = (context as any).getPhysicalFilename?.() || context.getFilename()
        // 从处理器修改的路径中提取原始路径（如果路径包含 /0_/，说明被处理器修改了）
        const originalFilename = filename.includes('/0_')
          ? filename.split('/0_')[0]
          : filename

        // 如果不是 .md 文件，跳过
        if (!originalFilename.endsWith('.md'))
          return

        // 读取原始 markdown 文件内容
        let text: string
        try {
          text = readFileSync(originalFilename, 'utf-8')
        }
        catch {
          // 如果无法读取文件，跳过
          return
        }

        // 不是 frontmatter 开头，直接跳过
        if (!text.startsWith('---'))
          return

        let parsed
        try {
          parsed = matter(text)
        }
        catch {
          return
        }

        const data = parsed.data as Record<string, unknown>

        if (!data || typeof data !== 'object')
          return

        // 验证每个字段
        for (const [fieldName, fieldConfig] of Object.entries(finalSchema)) {
          const fieldValue = data[fieldName]
          const isPresent = fieldName in data

          // 解析字段配置
          let fieldSchema: FieldSchema
          if (typeof fieldConfig === 'string') {
            fieldSchema = { type: fieldConfig, required: false }
          }
          else {
            fieldSchema = { required: false, ...fieldConfig }
          }

          // 检查必需字段
          if (fieldSchema.required && !isPresent) {
            context.report({
              loc: { line: 1, column: 0 },
              messageId: 'missingField',
              data: {
                field: fieldName,
              },
            })
            continue
          }

          // 如果字段存在，验证类型
          if (isPresent && fieldValue !== undefined && fieldValue !== null) {
            const actualType = getFieldType(fieldValue)
            if (!validateType(fieldValue, fieldSchema.type)) {
              context.report({
                loc: { line: 1, column: 0 },
                messageId: 'invalidType',
                data: {
                  field: fieldName,
                  expectedType: fieldSchema.type,
                  actualType: actualType || 'null/undefined',
                },
              })
            }
          }
        }
      },
    }
  },
}

export default rule
