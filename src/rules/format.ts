import type { Rule } from 'eslint'
import type { AST } from 'yaml-eslint-parser'
import type { FieldSchema, SchemaConfig } from '../utils/schema'
import { getStaticYAMLValue, parseYAML } from 'yaml-eslint-parser'
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
    const schemaConfig: SchemaConfig = (options.schema as SchemaConfig) || {}
    const defaultSchema: SchemaConfig = Object.keys(schemaConfig).length
      ? schemaConfig
      : { title: { type: 'string', required: true } }

    return {

      // @eslint/markdown 解析 YAML frontmatter 节点时 type='yaml'
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

        // 获取前matter的 JS 值
        const data = getStaticYAMLValue(ast)
        if (!data || typeof data !== 'object')
          return

        for (const [fieldName, fieldConfig] of Object.entries(defaultSchema)) {
          const fieldValue = data[fieldName as keyof typeof data]
          const isPresent = fieldName in data

          const schema: FieldSchema
            = typeof fieldConfig === 'string'
              ? { type: fieldConfig, required: false }
              : { required: false, ...fieldConfig }

          // 必填字段检查
          if (schema.required && !isPresent) {
            context.report({
              messageId: 'missingField',
              loc: node.position,
              data: { field: fieldName },
            })
            continue
          }

          // 类型检查
          if (isPresent && fieldValue !== undefined && fieldValue !== null) {
            const actualType = getFieldType(fieldValue)
            const mapping = findYAMLMapping(ast, fieldName)

            if (!validateType(fieldValue, schema.type)) {
              context.report({
                messageId: 'invalidType',
                loc: mapping?.key?.loc || node.position,
                data: { field: fieldName, expectedType: schema.type, actualType },
              })
            }
          }
        }
      },
    }
  },
}

function findYAMLMapping(
  program: AST.YAMLProgram,
  field: string,
): AST.YAMLPair | null {
  const doc = program.body[0]
  if (!doc || doc.type !== 'YAMLDocument')
    return null

  const content = doc.content
  if (!content || content.type !== 'YAMLMapping')
    return null

  for (const pair of content.pairs) {
    if (
      pair.key?.type === 'YAMLScalar'
      && pair.key.value === field
    ) {
      pair.key.loc.start.line = pair.key.loc.start.line += 1
      pair.key.loc.start.column = pair.key.loc.end.column + 2
      return pair
    }
  }

  return null
}

export default rule
