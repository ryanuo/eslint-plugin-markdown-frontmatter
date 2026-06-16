import type { Rule } from 'eslint'
import type { AST } from 'yaml-eslint-parser'
import type { SourceLocation } from 'yaml-eslint-parser/lib/ast'
import { getStaticYAMLValue, parseYAML } from 'yaml-eslint-parser'
import { getFieldType, validateType } from '../utils/validate'

type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date'

export interface FieldSchema {
  type: FieldType
  required?: boolean
}

export type SchemaConfig = Record<string, FieldType | FieldSchema>

/**
 * 关键函数：
 * 将 YAML AST 的 loc → 映射到 Markdown 文件中的 loc
 *
 * YAML AST 的行号是从 YAML 内容本身计算的（从 1 开始）
 * 而 Markdown 中 frontmatter 的第一行是 '---'，YAML 内容从第二行开始
 * 所以需要加上 1 行的偏移量
 */
function resolveYAMLLoc(
  yamlLoc: AST.SourceLocation,
  frontmatterNode: { position?: { start: { line: number } } },
): SourceLocation {
  if (!frontmatterNode.position)
    return yamlLoc

  // YAML 内容从 frontmatter 的第二行开始（第一行是 '---'）
  const lineOffset = frontmatterNode.position.start.line

  return {
    start: {
      line: yamlLoc.start.line + lineOffset,
      column: yamlLoc.start.column,
    },
    end: {
      line: yamlLoc.end.line + lineOffset,
      column: yamlLoc.end.column,
    },
  }
}

/**
 * 在 YAML AST 中找到某个字段对应的 pair
 */
function findYAMLPair(
  program: AST.YAMLProgram,
  field: string,
): AST.YAMLPair | null {
  const doc = program.body[0]
  if (!doc || doc.type !== 'YAMLDocument')
    return null

  const content = doc.content
  if (!content || content.type !== 'YAMLMapping')
    return null

  return (
    content.pairs.find(
      pair =>
        pair.key?.type === 'YAMLScalar'
        && pair.key.value === field,
    ) ?? null
  )
}

/* ======================= rule ======================= */

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate markdown frontmatter against schema',
    },
    schema: [
      {
        type: 'object',
        properties: {
          schema: {
            type: 'object',
            additionalProperties: {
              oneOf: [
                { type: 'string' },
                {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
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
    const schemaConfig: SchemaConfig = options.schema || {
      title: { type: 'string', required: true },
    }

    return {
      yaml(node: any) {
        if (!node.value)
          return

        let ast: AST.YAMLProgram
        try {
          ast = parseYAML(node.value)
        }
        catch {
          return
        }

        const data = getStaticYAMLValue(ast)
        if (!data || typeof data !== 'object')
          return

        for (const [fieldName, config] of Object.entries(schemaConfig)) {
          const schema: FieldSchema
            = typeof config === 'string'
              ? { type: config }
              : { required: false, ...config }

          const isPresent = fieldName in data
          const value = (data as any)[fieldName]

          /* -------- missing field -------- */
          if (schema.required && !isPresent) {
            const reportLocation = node.position
              ? {
                  start: {
                    line: node.position.start.line,
                    column: node.position.start.column,
                  },
                  end: {
                    line: node.position.end.line,
                    column: node.position.end.column,
                  },
                }
              : { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } }

            context.report({
              messageId: 'missingField',
              loc: reportLocation,
              data: { field: fieldName },
            })
            continue
          }

          /* -------- type invalid -------- */
          if (isPresent && value != null && !validateType(value, schema.type)) {
            const pair = findYAMLPair(ast, fieldName)

            context.report({
              messageId: 'invalidType',
              loc: pair?.key?.loc
                ? resolveYAMLLoc(pair.key.loc, node)
                : { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
              data: {
                field: fieldName,
                expectedType: schema.type,
                actualType: getFieldType(value),
              },
            })
          }
        }
      },
    }
  },
}

export default rule
