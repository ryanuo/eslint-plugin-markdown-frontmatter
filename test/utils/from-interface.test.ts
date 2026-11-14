import { describe, expect, it } from 'vitest'
import { fromInterface } from '../../src/utils/from-interface'

const FIXTURE = 'test/fixtures/frontmatter.d.ts'

describe('fromInterface', () => {
  it('maps scalar / array / object / date fields from an interface', () => {
    const schema = fromInterface(FIXTURE, 'Post')

    expect(schema.title).toEqual({ required: true, type: 'string' })
    expect(schema.description).toEqual({ required: true, type: 'string' })
    expect(schema.date).toEqual({ required: true, type: 'string' })
    expect(schema.tags).toEqual({ required: false, type: 'array' })
    expect(schema.cate).toEqual({ required: false, type: 'string' })
    expect(schema.plum).toEqual({ required: false, type: 'boolean' })
    expect(schema.titleStyle).toEqual({ required: false, type: 'object' })
    expect(schema.cover).toEqual({ required: false, type: 'date' })
    expect(schema.list).toEqual({ required: false, type: 'array' })
    expect(schema.record).toEqual({ required: false, type: 'object' })
  })

  it('picks the first mappable member of a union', () => {
    expect(fromInterface(FIXTURE, 'Post').keywords).toEqual({
      required: false,
      type: 'string',
    })
  })

  it('supports `type X = { ... }` aliases', () => {
    const schema = fromInterface(FIXTURE, 'Page')

    expect(schema.title).toEqual({ required: true, type: 'string' })
    expect(schema.isHiddenTitle).toEqual({ required: false, type: 'boolean' })
  })

  it('strips quotes from quoted field names', () => {
    const schema = fromInterface(FIXTURE, 'Localized')

    expect(Object.keys(schema).sort()).toEqual(['en-US', 'zh-CN'])
  })

  it('applies overrides on top of the generated schema', () => {
    const schema = fromInterface(FIXTURE, 'Post', {
      overrides: {
        date: { required: true, type: 'date' },
        extra: 'string',
      },
    })

    expect(schema.date).toEqual({ required: true, type: 'date' })
    // overrides 原样透传，字符串简写保持简写（规则内部再归一化）
    expect(schema.extra).toBe('string')
  })

  it('throws on unmappable field types instead of silently skipping', () => {
    expect(() => fromInterface(FIXTURE, 'WithCustom')).toThrow(/weird/)
  })

  it('throws when the interface is missing', () => {
    expect(() => fromInterface(FIXTURE, 'Nope')).toThrow(/找不到/)
  })
})
