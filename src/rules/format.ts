// src/rules/format.ts
import { ESLintUtils } from '@typescript-eslint/utils'
import { parseFrontmatter } from '../utils/parse'

export const formatRule = ESLintUtils.RuleCreator(
  () => 'https://github.com/ryanuo/eslint-plugin-markdown-frontmatter',
)({
  name: 'format',
  meta: {
    type: 'layout',
    docs: {
      description: 'Format markdown frontmatter',
    },
    schema: [],
    fixable: 'code',
    messages: {
      detected: 'Frontmatter detected',
    },
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename
    if (!filename.endsWith('.md'))
      return {}

    const sourceCode = context.sourceCode
    const parsed = parseFrontmatter(sourceCode.text)
    if (!parsed || !parsed.rawMatter)
      return {}

    return {
      Program(node) {
        context.report({
          node,
          messageId: 'detected',
        })
      },

    }
  },
})
