// src/utils/parse.ts
import matter from 'gray-matter'

export function parseFrontmatter(code: string): {
  data: Record<string, any>
  content: string
  rawMatter: string
} | null {
  try {
    const result = matter(code)
    return {
      data: result.data as Record<string, any>,
      content: result.content,
      rawMatter: result.matter,
    }
  }

  catch {
    return null
  }
}
