import type { Rule } from 'eslint'
import type { FieldSchema, FieldType, SchemaConfig } from '../utils/schema'
import { readFileSync } from 'node:fs'
import matter from 'gray-matter'
import { getFieldType, validateType } from '../utils/validate'

/**
 * 从 processor 处理后的文件名中提取原始文件路径
 * /path/to/file.md/0_/path/to/file.md → /path/to/file.md
 */
function getOriginalFilename(filename: string): string {
  return filename.split('/0_')[0]
}

/**
 * 读取 Markdown 文件内容
 */
function readMarkdownFile(filename: string): string | null {
  try {
    return readFileSync(filename, 'utf-8')
  }
  catch {
    return null
  }
}

/**
 * 提取 frontmatter 内容
 */
function extractFrontmatter(text: string): string | null {
  const match = text.match(/^---\n([\s\S]*?)\n---/)
  return match ? match[1] : null
}

/**
 * 构建字段名到行列位置的映射
 */
function buildFieldPositionMap(frontmatterContent: string): Map<string, { line: number, column: number }> {
  const map = new Map<string, { line: number, column: number }>()
  const lines = frontmatterContent.split('\n')

  lines.forEach((line, index) => {
    const match = line.match(/^(\s*)(\w+):/)
    if (match) {
      const [, indent, fieldName] = match
      map.set(fieldName, {
        line: index + 2, // +2: 第1行是 ---，frontmatter 从第2行开始
        column: indent.length,
      })
    }
  })

  return map
}

/**
 * 解析字段配置为统一格式
 */
function parseFieldSchema(fieldConfig: FieldSchema | FieldType): FieldSchema {
  if (typeof fieldConfig === 'string') {
    return { type: fieldConfig, required: false }
  }
  return { required: false, ...fieldConfig }
}

/**
 * 获取默认 schema（向后兼容）
 */
function getDefaultSchema(schemaConfig: SchemaConfig): SchemaConfig {
  const hasSchema = Object.keys(schemaConfig).length > 0
  return hasSchema ? schemaConfig : { title: { type: 'string', required: true } }
}

// ============ 规则定义 ============

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
                {
                  type: 'string',
                  enum: ['string', 'number', 'boolean', 'array', 'object', 'date'],
                },
                {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['string', 'number', 'boolean', 'array', 'object', 'date'],
                    },
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
      parseFailed: 'Failed to parse frontmatter: {{error}}',
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const schemaConfig = (options.schema as SchemaConfig) || {}
    const finalSchema = getDefaultSchema(schemaConfig)

    return {
      Program(node) {
        // 1. 获取原始文件路径
        const filename = context.getFilename()
        const originalFilename = getOriginalFilename(filename)

        if (!originalFilename.endsWith('.md'))
          return

        // 2. 读取文件内容
        const text = readMarkdownFile(originalFilename)
        if (!text || !text.startsWith('---'))
          return

        // 3. 提取 frontmatter
        const frontmatterContent = extractFrontmatter(text)
        if (!frontmatterContent)
          return

        // 4. 解析 frontmatter
        let parsed
        try {
          parsed = matter(text)
        }
        catch (error) {
          context.report({
            node,
            messageId: 'parseFailed',
            loc: { line: 1, column: 0 },
            data: {
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          })
          return
        }

        const data = parsed.data as Record<string, unknown>
        if (!data || typeof data !== 'object')
          return

        // 5. 构建字段位置映射
        const fieldPositionMap = buildFieldPositionMap(frontmatterContent)

        // 6. 验证每个字段
        validateFields(context, node, data, finalSchema, fieldPositionMap)
      },
    }
  },
}

/**
 * 验证所有字段
 */
function validateFields(
  context: Rule.RuleContext,
  node: any,
  data: Record<string, unknown>,
  schema: SchemaConfig,
  fieldPositionMap: Map<string, { line: number, column: number }>,
): void {
  for (const [fieldName, fieldConfig] of Object.entries(schema)) {
    const fieldValue = data[fieldName]
    const isPresent = fieldName in data
    const fieldSchema = parseFieldSchema(fieldConfig)

    // 检查必需字段
    if (fieldSchema.required && !isPresent) {
      reportMissingField(context, node, fieldName)
      continue
    }

    // 验证字段类型
    if (isPresent && fieldValue !== undefined && fieldValue !== null) {
      validateFieldType(context, node, fieldName, fieldValue, fieldSchema, fieldPositionMap)
    }
  }
}

/**
 * 报告缺失字段错误
 */
function reportMissingField(
  context: Rule.RuleContext,
  node: any,
  fieldName: string,
): void {
  context.report({
    node,
    loc: { line: 2, column: 0 },
    messageId: 'missingField',
    data: { field: fieldName },
  })
}

/**
 * 验证字段类型
 */
function validateFieldType(
  context: Rule.RuleContext,
  node: any,
  fieldName: string,
  fieldValue: unknown,
  fieldSchema: FieldSchema,
  fieldPositionMap: Map<string, { line: number, column: number }>,
): void {
  const actualType = getFieldType(fieldValue)

  if (!validateType(fieldValue, fieldSchema.type)) {
    const position = fieldPositionMap.get(fieldName) || { line: 2, column: 0 }

    context.report({
      node,
      loc: { line: position.line, column: position.column },
      messageId: 'invalidType',
      data: {
        field: fieldName,
        expectedType: fieldSchema.type,
        actualType: actualType || 'null/undefined',
      },
    })
  }
}

export default rule
