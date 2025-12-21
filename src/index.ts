import type { ESLint, Linter } from 'eslint'
import format from './rules/format'

// 导出工具函数和类型，方便用户从 TypeScript 类型生成 schema
export {
  createSchema,
  type FieldSchema,
  type FieldType,
  generateSchema,
  type SchemaConfig,
} from './utils/schema'

// 自定义处理器：将整个 markdown 文件作为一个代码块处理
const markdownProcessor: Linter.Processor = {
  preprocess(text: string, filename: string): Linter.ProcessorFile[] {
    // 返回一个有效的 JavaScript 代码块，这样 ESLint 就能解析它
    // 规则会通过 context.getFilename() 读取原始文件内容
    return [
      {
        text: '// markdown file',
        filename,
      },
    ]
  },
  postprocess(messages: Linter.LintMessage[][], _filename: string): Linter.LintMessage[] {
    // 返回所有消息
    return messages.flat()
  },
  supportsAutofix: true,
}

const plugin: ESLint.Plugin = {
  rules: {
    format,
  },
  processors: {
    markdown: markdownProcessor,
  },
}

export default plugin
