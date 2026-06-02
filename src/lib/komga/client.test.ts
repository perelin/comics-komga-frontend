import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { komga } from './client'

type Init = { method?: string; body?: string; headers?: Record<string, string> }

describe('komga read-progress mutations', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204, statusText: 'No Content' })
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  const call = () => fetchMock.mock.calls[0] as [string, Init]

  it('markBookRead PATCHes {completed:true} with a JSON content-type', async () => {
    await komga.markBookRead('b1')
    const [url, init] = call()
    expect(url).toBe('/komga/api/v1/books/b1/read-progress')
    expect(init.method).toBe('PATCH')
    expect(init.body).toBe(JSON.stringify({ completed: true }))
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
  })

  it('markBookUnread DELETEs with no body', async () => {
    await komga.markBookUnread('b1')
    const [url, init] = call()
    expect(url).toBe('/komga/api/v1/books/b1/read-progress')
    expect(init.method).toBe('DELETE')
    expect(init.body).toBeUndefined()
  })

  it('markSeriesRead POSTs the series read-progress endpoint', async () => {
    await komga.markSeriesRead('s1')
    const [url, init] = call()
    expect(url).toBe('/komga/api/v1/series/s1/read-progress')
    expect(init.method).toBe('POST')
    expect(init.body).toBeUndefined()
  })

  it('markSeriesUnread DELETEs the series read-progress endpoint', async () => {
    await komga.markSeriesUnread('s1')
    const [url, init] = call()
    expect(url).toBe('/komga/api/v1/series/s1/read-progress')
    expect(init.method).toBe('DELETE')
  })

  it('throws on a non-2xx response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' })
    await expect(komga.markBookRead('b1')).rejects.toThrow(/500/)
  })
})
