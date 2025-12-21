import frontmatter from '../dist/index.mjs'
console.log('USING PLAYGROUND CONFIG')

export default [
  {
    files: ['*.md'],
    processor: frontmatter.processors.markdown,
    plugins: {
      frontmatter,
    },
    rules: {
      // 使用自定义 schema 配置
      'frontmatter/format': [
        'error',
        {
          schema: {
            // 必需字段，使用完整配置对象
            title: {
              type: 'string',
              required: true,
            },
            // 必需字段，使用简写形式（默认 required: false，但可以显式设置）
            date: {
              type: 'date',
              required: true,
            },
            // 可选字段，使用简写形式
            tags: 'array',
            // 可选字段，使用完整配置
            author: {
              type: 'string',
              required: false,
            },
          },
        },
      ],
    },
  },
]
