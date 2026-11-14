import type { Rule } from 'eslint'
import type { AST } from 'yaml-eslint-parser'
import { getStaticYAMLValue, parseYAML } from 'yaml-eslint-parser'
import { getFieldType, validateType } from '../utils/validate'

type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date'

export interface FieldSchema {
  type: FieldType
  required?: boolean
}

export type SchemaConfig = Record<string, FieldType | FieldSchema>

interface Point {
  line: number
  column: number
}

interface Loc {
  start: Point
  end: Point
}

interface Positioned {
  position?: Loc
}

/**
 * 把 yaml-eslint-parser 的 loc 映射到 Markdown 文件中的 loc。
 *
 * 两套坐标系的差异：
 * - 行号：YAML 内容的第 1 行，是 Markdown 中 frontmatter 开围栏的下一行。
 *   mdast 的 `yaml` 节点 position.start.line 正是开围栏 `---` 所在行，
 *   因此 `markdownLine = yamlLine + start.line`。
 * - 列号：yaml-eslint-parser 是 **0 基**（ESLint 风格），而 @eslint/markdown
 *   的语言是 **1 基**（mdast 风格，columnStart = 1）。必须 +1，
 *   否则报错位置整体左移一格，在编辑器里就是"标红错位"。
 */
function toMarkdownLoc(yamlLoc: Loc, frontmatter: Positioned): Loc {
  const base = frontmatter.position?.start ?? { line: 1, column: 1 }

  return {
    start: {
      line: yamlLoc.start.line + base.line,
      column: yamlLoc.start.column + base.column,
    },
    end: {
      line: yamlLoc.end.line + base.line,
      column: yamlLoc.end.column + base.column,
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

/**
 * 缺失字段没有可指向的具体位置，退化为指向开围栏 `---`（一行三字符）。
 * 比整块 frontmatter 全部标红更容易看出"这块缺东西"。
 */
function getFrontmatterStartLoc(frontmatter: Positioned): Loc {
  const base = frontmatter.position?.start ?? { line: 1, column: 1 }

  return {
    start: { line: base.line, column: base.column },
    end: { line: base.line, column: base.column + 3 },
  }
}

/**
 * Levenshtein 编辑距离（用于"你是不是想写 XXX"）
 */
function editDistance(a: string, b: string): number {
  const rows = a.length + 1
  const cols = b.length + 1
  let prev = Array.from({ length: cols }, (_, i) => i)

  for (let i = 1; i < rows; i++) {
    const curr = [i]
    for (let j = 1; j < cols; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    prev = curr
  }

  return prev[cols - 1]
}

/**
 * 在已知字段里找一个足够接近的（拼写错误时给出建议）
 */
function findClosestField(field: string, candidates: string[]): string | null {
  const threshold = Math.max(1, Math.floor(field.length / 3))
  let best: string | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    const distance = editDistance(field.toLowerCase(), candidate.toLowerCase())
    if (distance <= threshold && distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }

  return best
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
          /**
           * 开启后，schema 里没声明的字段（通常是拼错）也会报错
           */
          strict: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingField: 'Frontmatter must contain a `{{field}}` field',
      invalidType: 'Field `{{field}}` must be of type `{{expectedType}}`, but got `{{actualType}}`',
      unexpectedField: 'Unknown frontmatter field `{{field}}`',
      unexpectedFieldWithSuggestion: 'Unknown frontmatter field `{{field}}`, did you mean `{{suggestion}}`?',
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const schemaConfig: SchemaConfig = options.schema || {
      title: { type: 'string', required: true },
    }
    const strict: boolean = options.strict === true

    return {
      yaml(node: any) {
        if (!node.value || typeof node.value !== 'string')
          return

        let ast: AST.YAMLProgram
        try {
          ast = parseYAML(node.value)
        }
        catch {
          return
        }

        const data = getStaticYAMLValue(ast)
        if (!data || typeof data !== 'object' || Array.isArray(data))
          return

        for (const [fieldName, config] of Object.entries(schemaConfig)) {
          const schema: FieldSchema
            = typeof config === 'string'
              ? { type: config }
              : { required: false, ...config }

          const isPresent = Object.prototype.hasOwnProperty.call(data, fieldName)
          const value = (data as Record<string, unknown>)[fieldName]

          /* -------- missing field -------- */
          if (schema.required && !isPresent) {
            context.report({
              messageId: 'missingField',
              loc: getFrontmatterStartLoc(node),
              data: { field: fieldName },
            })
            continue
          }

          /* -------- type invalid -------- */
          if (isPresent && value != null && !validateType(value, schema.type)) {
            const pair = findYAMLPair(ast, fieldName)
            // 优先标在"值"上（要改的是值），退化为标在键上
            const target = (pair?.value?.loc ?? pair?.key?.loc) as Loc | undefined

            context.report({
              messageId: 'invalidType',
              loc: target
                ? toMarkdownLoc(target, node)
                : getFrontmatterStartLoc(node),
              data: {
                field: fieldName,
                expectedType: schema.type,
                actualType: getFieldType(value),
              },
            })
          }
        }

        /* -------- unknown field（strict）-------- */
        if (strict) {
          const knownFields = Object.keys(schemaConfig)

          for (const fieldName of Object.keys(data)) {
            if (Object.prototype.hasOwnProperty.call(schemaConfig, fieldName))
              continue

            const pair = findYAMLPair(ast, fieldName)
            const suggestion = findClosestField(fieldName, knownFields)

            context.report({
              messageId: suggestion
                ? 'unexpectedFieldWithSuggestion'
                : 'unexpectedField',
              loc: pair?.key?.loc
                ? toMarkdownLoc(pair.key.loc as Loc, node)
                : getFrontmatterStartLoc(node),
              data: {
                field: fieldName,
                suggestion: suggestion ?? '',
              },
            })
          }
        }
      },
    }
  },
}

export default rule
