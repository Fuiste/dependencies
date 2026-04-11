import { describe, expect, it } from 'vitest'
import { Context } from '../src'

describe('Context', () => {
  const Name = Context.Tag<string>('name')
  const Age = Context.Tag<number>('age')

  it('creates stable tags for a key', () => {
    expect(Context.Tag<string>('name')).toBe(Name)
  })

  it('stores and retrieves services immutably', () => {
    const nameContext = Context.of(Name, 'Rudy')
    const fullContext = Context.add(nameContext, Age, 32)

    expect(Context.get(nameContext, Name)).toBe('Rudy')
    expect(Context.get(fullContext, Name)).toBe('Rudy')
    expect(Context.get(fullContext, Age)).toBe(32)
    expect(Context.has(nameContext, Age)).toBe(false)
  })

  it('rejects duplicate services during merge', () => {
    const left = Context.of(Name, 'left')
    const right = Context.of(Name, 'right')

    expect(() => Context.merge(left, right)).toThrow("Duplicate service for tag 'name'")
  })
})
