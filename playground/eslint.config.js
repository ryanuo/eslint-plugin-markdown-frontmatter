// eslint.config.js
import markdown from '@eslint/markdown'
import frontmatterPlugin from 'eslint-plugin-markdown-frontmatter'

export default [
  {
    files: ['**/*.md'],
    plugins: {
      markdown,
      'markdown-frontmatter': frontmatterPlugin,
    },
    language: 'markdown/gfm',
    languageOptions: {
      frontmatter: 'yaml',
    },
    rules: {
      // 你的 frontmatter 验证规则
      'markdown-frontmatter/format': ['error', {
        schema: {
          title: { type: 'string', required: true },
          date: { type: 'date', required: true },
          tags: { type: 'array', required: false },
        },
      }],
    },
  },
]
