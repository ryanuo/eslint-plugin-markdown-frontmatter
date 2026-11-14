interface Post {
  title: string
  description: string
  tags?: string[]
  cate?: string
  date: string
  image?: string
  plum?: boolean
  titleStyle?: { fontFamily: string, opacity: number }
  cover?: Date
  keywords?: string | string[]
  list?: Array<number>
  record?: Record<string, unknown>
}

interface Page {
  title: string
  isHiddenTitle?: boolean
}

interface WithCustom {
  title: string
  weird?: SomeCustomType
}

interface Localized {
  'zh-CN'?: string
  'en-US'?: string
}
