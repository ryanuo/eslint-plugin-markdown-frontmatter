import markdown from '@eslint/markdown'
import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import rule from '../../src/rules/format'

const ruleTester = new RuleTester({
  language: 'markdown/gfm',
  languageOptions: {
    frontmatter: 'yaml',
  },
  plugins: {
    markdown,
    frontmatter: { rules: { format: rule } },
  },
})

const schema = {
  schema: {
    title: { type: 'string', required: true },
    date: { type: 'date', required: false },
    tags: { type: 'array', required: false },
    plum: { type: 'boolean', required: false },
  },
}

describe('rules/format', () => {
  it('reports precise locations', () => {
    ruleTester.run('format', rule, {
      valid: [
        // 无 frontmatter：不报错
        {
          code: `# Hello\n`,
          options: [schema],
          filename: 'no-fm.md',
        },
        // 正常 frontmatter
        {
          code: `---\ntitle: '演示 | RYANUO'\ndescription: 'demo'\nplum: true\n---\n\n# t\n`,
          options: [schema],
          filename: 'valid.md',
        },
        // date 支持带时间字符串
        {
          code: `---\ntitle: hi\ndate: "2023-05-30 16:47:08"\n---\n\n# t\n`,
          options: [schema],
          filename: 'valid-date.md',
        },
        // tags 块状数组
        {
          code: `---\ntitle: hi\ntags:\n  - git\n  - linux\n---\n\n# t\n`,
          options: [schema],
          filename: 'valid-array.md',
        },
      ],
      invalid: [
        // 缺 title：指向开围栏 `---`（第 1 行 1-4 列）
        {
          code: `---\ndescription: ok\nplum: true\n---\n\n# t\n`,
          options: [schema],
          filename: 'missing.md',
          errors: [
            {
              messageId: 'missingField',
              line: 1,
              column: 1,
              endLine: 1,
              endColumn: 4,
            },
          ],
        },
        // 类型错误：精确指向值 `123`（第 2 行第 8 列，1 基）
        {
          code: `---\ntitle: 123\ndescription: ok\n---\n\n# t\n`,
          options: [schema],
          filename: 'invalid-type.md',
          errors: [
            {
              messageId: 'invalidType',
              line: 2,
              column: 8,
              endLine: 2,
              endColumn: 11,
            },
          ],
        },
        // 布尔值位置：plum: "yes" 不是 boolean
        {
          code: `---\ntitle: hi\nplum: "yes"\n---\n\n# t\n`,
          options: [schema],
          filename: 'invalid-bool.md',
          errors: [
            {
              messageId: 'invalidType',
              line: 3,
              column: 7,
              endLine: 3,
              endColumn: 12,
            },
          ],
        },
        // 数组字段写成标量：整段值标红
        {
          code: `---\ntitle: hi\ntags: git\n---\n\n# t\n`,
          options: [schema],
          filename: 'invalid-array.md',
          errors: [
            {
              messageId: 'invalidType',
              line: 3,
              column: 7,
              endLine: 3,
              endColumn: 10,
            },
          ],
        },
      ],
    })
  })

  it('reports unknown fields in strict mode', () => {
    // 带上 cate，才好验证"拼错时给建议"
    const strictOptions = {
      strict: true,
      schema: {
        ...schema.schema,
        cate: { type: 'string', required: false } as const,
      },
    }

    ruleTester.run('format', rule, {
      valid: [
        // 默认不开启 strict：未声明的字段放行
        {
          code: `---\ntitle: hi\ncatess: 随笔\n---\n\n# t\n`,
          options: [schema],
          filename: 'unknown-not-strict.md',
        },
        // strict 下声明过的字段不报
        {
          code: `---\ntitle: hi\ntags: [a]\nplum: true\ncate: 随笔\n---\n\n# t\n`,
          options: [strictOptions],
          filename: 'strict-ok.md',
        },
      ],
      invalid: [
        // 拼错字段：给出建议，并精确标在该键上
        {
          code: `---\ntitle: 2021年-新的起点\ndate: "2021-01-01 00:00"\ncatess: 随笔\nplum: true\n---\n\n# t\n`,
          options: [strictOptions],
          filename: 'strict-typo.md',
          errors: [
            {
              messageId: 'unexpectedFieldWithSuggestion',
              data: { field: 'catess', suggestion: 'cate' },
              line: 4,
              column: 1,
              endLine: 4,
              endColumn: 7,
            },
          ],
        },
        // 完全无关的字段：只报未知，不给建议
        {
          code: `---\ntitle: hi\ntotallyUnknownKey: 1\n---\n\n# t\n`,
          options: [strictOptions],
          filename: 'strict-unknown.md',
          errors: [
            {
              messageId: 'unexpectedField',
              data: { field: 'totallyUnknownKey' },
              line: 3,
              column: 1,
            },
          ],
        },
      ],
    })
  })
})
