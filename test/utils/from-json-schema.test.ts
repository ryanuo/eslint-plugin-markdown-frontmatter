import type { JsonSchema } from '../../src/utils/from-json-schema'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fromJsonSchema } from '../../src/utils/from-json-schema'

function fixture(name: string): JsonSchema {
  return JSON.parse(
    readFileSync(`test/fixtures/${name}`, 'utf8'),
  ) as JsonSchema
}

describe('fromJsonSchema', () => {
  const withRef = fixture('frontmatter.schema.json')

  it('resolves a top-level $ref and maps every property', () => {
    const schema = fromJsonSchema(withRef)

    expect(schema.title).toEqual({ required: true, type: 'string' })
    expect(schema.description).toEqual({ required: true, type: 'string' })
    expect(schema.date).toEqual({ required: true, type: 'date' })
    expect(schema.tags).toEqual({ required: false, type: 'array' })
    expect(schema.cate).toEqual({ required: false, type: 'string' })
    expect(schema.plum).toEqual({ required: false, type: 'boolean' })
    expect(schema.titleStyle).toEqual({ required: false, type: 'object' })
    expect(schema.count).toEqual({ required: false, type: 'number' })
  })

  it('maps anyOf / enum / object-without-type', () => {
    const schema = fromJsonSchema(withRef)

    expect(schema.mixed).toEqual({ required: false, type: 'string' })
    expect(schema.level).toEqual({ required: false, type: 'string' })
  })

  it('accepts a flat object schema (no $ref)', () => {
    const schema = fromJsonSchema({
      type: 'object',
      properties: {
        title: { type: 'string' },
        date: { type: 'string', format: 'date' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['title'],
    })

    expect(schema.title).toEqual({ required: true, type: 'string' })
    expect(schema.date).toEqual({ required: false, type: 'date' })
    expect(schema.tags).toEqual({ required: false, type: 'array' })
  })

  it('resolves $defs references', () => {
    const schema = fromJsonSchema({
      type: 'object',
      properties: { meta: { $ref: '#/$defs/Meta' } },
      $defs: { Meta: { type: 'object', properties: {} } },
    })

    expect(schema.meta).toEqual({ required: false, type: 'object' })
  })

  it('applies overrides', () => {
    const schema = fromJsonSchema(withRef, {
      overrides: { date: { required: true, type: 'date' }, extra: 'string' },
    })

    expect(schema.date).toEqual({ required: true, type: 'date' })
    expect(schema.extra).toBe('string')
  })

  it('throws when properties are missing', () => {
    expect(() => fromJsonSchema({ type: 'string' })).toThrow(/properties/)
  })
})
