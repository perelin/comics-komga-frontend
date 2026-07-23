import { describe, it, expect } from 'vitest'
import { komgaReaderUrl, komgaSeriesUrl } from './reader'

describe('komgaReaderUrl', () => {
  it('builds an absolute Komga web-reader URL for a book', () => {
    expect(komgaReaderUrl('0PMG4VV8Q5WJ9')).toBe('https://komga.test/book/0PMG4VV8Q5WJ9/read')
  })
})

describe('komgaSeriesUrl', () => {
  it('builds an absolute Komga series URL', () => {
    expect(komgaSeriesUrl('s1')).toBe('https://komga.test/series/s1')
  })
})
