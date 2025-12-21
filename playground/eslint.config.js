import frontmatter from 'eslint-plugin-markdown-frontmatter'

export default [
  {
    files: ['**/*.md'],
    plugins: {
      frontmatter,
    },
    rules: {
      'frontmatter/format': 'error',
    },
  },
]
