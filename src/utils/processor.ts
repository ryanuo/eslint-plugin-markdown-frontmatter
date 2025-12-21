import type { Linter } from 'eslint'

const markdownProcessor: Linter.Processor = {
  preprocess(text: string, filename: string): Linter.ProcessorFile[] {
    return [
      {
        text: '// markdown file',
        filename, // 保持原文件名
      },
    ]
  },
  postprocess(messages: Linter.LintMessage[][]): Linter.LintMessage[] {
    return messages.flat()
  },
  supportsAutofix: false,
}

export default markdownProcessor
