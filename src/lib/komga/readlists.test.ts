import { describe, it, expect } from 'vitest'
import {
  DEFAULT_READLIST_NAME, addIds, moveId, removeReadIds, bookIdsInOrder, resolveDefaultListId,
} from './readlists'
import type { KomgaBookDto, KomgaReadListDto } from './types'

const book = (id: string, completed?: boolean): KomgaBookDto => ({
  id, seriesId: 's1', seriesTitle: 'Series', name: id, media: { pagesCount: 10 },
  metadata: { title: id, number: id, numberSort: Number(id.replace(/\D/g, '')) || 0, releaseDate: null, summary: '' },
  readProgress: completed === undefined ? null : { page: 10, completed, readDate: '' },
})
const list = (over: Partial<KomgaReadListDto> = {}): KomgaReadListDto => ({
  id: 'r1', name: DEFAULT_READLIST_NAME, summary: '', ordered: true,
  bookIds: [], filtered: false, createdDate: '', lastModifiedDate: '', ...over,
})

describe('addIds', () => {
  it('appends only missing ids, preserving order', () => {
    expect(addIds(['a', 'b'], ['b', 'c', 'a', 'd'])).toEqual(['a', 'b', 'c', 'd'])
  })
  it('dedups the incoming ids', () => {
    expect(addIds([], ['x', 'x', 'y'])).toEqual(['x', 'y'])
  })
})

describe('moveId', () => {
  it('moves an item down', () => { expect(moveId(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']) })
  it('moves an item up', () => { expect(moveId(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']) })
  it('is a no-op for equal indices', () => { expect(moveId(['a', 'b'], 1, 1)).toEqual(['a', 'b']) })
})

describe('removeReadIds', () => {
  it('drops ids whose book is completed', () => {
    const books = [book('b1', true), book('b2', false), book('b3')]
    expect(removeReadIds(['b1', 'b2', 'b3'], books)).toEqual(['b2', 'b3'])
  })
  it('keeps ids with no matching book (unknown → keep)', () => {
    expect(removeReadIds(['b1', 'x'], [book('b1', true)])).toEqual(['x'])
  })
})

describe('bookIdsInOrder', () => {
  it('maps the (already sorted) books to ids', () => {
    expect(bookIdsInOrder([book('1'), book('2'), book('3')])).toEqual(['1', '2', '3'])
  })
})

describe('resolveDefaultListId', () => {
  const lists = [list({ id: 'r9', name: 'Other' }), list({ id: 'r1', name: DEFAULT_READLIST_NAME })]
  it('prefers a valid cached id', () => { expect(resolveDefaultListId(lists, 'r9')).toBe('r9') })
  it('falls back to the name match when the cached id is gone', () => {
    expect(resolveDefaultListId(lists, 'stale')).toBe('r1')
  })
  it('returns null when neither cache nor name match', () => {
    expect(resolveDefaultListId([list({ id: 'r9', name: 'Other' })], null)).toBeNull()
  })
})
