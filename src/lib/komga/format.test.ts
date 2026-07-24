import { describe, it, expect } from 'vitest'
import { parseFormat, isFormatKind, FORMAT_KINDS, FORMAT_LABEL } from './format'

describe('parseFormat', () => {
  it('parses each primary format kind', () => {
    for (const kind of FORMAT_KINDS) {
      expect(parseFormat([`format:${kind}`])).toEqual({ kind, mixed: false })
    }
  })
  it('picks the primary out of unrelated tags', () => {
    expect(parseFormat(['rating:4.20', 'variant cover', 'format:tpb']))
      .toEqual({ kind: 'tpb', mixed: false })
  })
  it('carries the mixed flag alongside the primary', () => {
    expect(parseFormat(['format:singles', 'format:mixed'])).toEqual({ kind: 'singles', mixed: true })
  })
  it('returns undefined for untagged series', () => {
    expect(parseFormat(['rating:4.20', 'noir'])).toBeUndefined()
    expect(parseFormat([])).toBeUndefined()
  })
  it('format:mixed alone is a flag, not a format → undefined', () => {
    expect(parseFormat(['format:mixed'])).toBeUndefined()
  })
  it('ignores unknown format:* values', () => {
    expect(parseFormat(['format:hardcover'])).toBeUndefined()
  })
})

describe('isFormatKind', () => {
  it('accepts the five primary kinds and rejects everything else', () => {
    for (const kind of FORMAT_KINDS) expect(isFormatKind(kind)).toBe(true)
    expect(isFormatKind('mixed')).toBe(false)
    expect(isFormatKind('hardcover')).toBe(false)
  })
})

describe('FORMAT_LABEL', () => {
  it('has a label for every kind', () => {
    for (const kind of FORMAT_KINDS) expect(FORMAT_LABEL[kind]).toBeTruthy()
  })
})
