import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { komga, handleSessionExpired, resetSessionRedirectForTests, setSessionNavigatorForTests } from './client'
import { DEFAULT_FILTERS } from './filters'

const page = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 50, first: true, last: true }

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

describe('komga.series POST /series/list', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK', json: async () => page })
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('POSTs the condition body with sort/page/size query params', async () => {
    await komga.series({ ...DEFAULT_FILTERS, authors: ['Neil Gaiman'] }, 0, 50)
    const [url, init] = fetchMock.mock.calls[0] as [string, { method?: string; body?: string; headers?: Record<string, string> }]
    expect(url).toBe('/komga/api/v1/series/list?sort=booksMetadata.releaseDate%2Cdesc&page=0&size=50')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body!)).toEqual({ condition: { author: { operator: 'is', value: { name: 'Neil Gaiman' } } } })
  })

  it('authorNames GETs /authors/names with the search param', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', json: async () => ['Neil Gaiman'] })
    const res = await komga.authorNames('gaiman')
    const [url, init] = fetchMock.mock.calls[0] as [string, { method?: string }]
    expect(url).toBe('/komga/api/v1/authors/names?search=gaiman')
    expect(init?.method).toBeUndefined() // plain GET
    expect(res).toEqual(['Neil Gaiman'])
  })
})

describe('komga read-list endpoints', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  const rl = {
    id: 'r1', name: 'To Read', summary: '', ordered: true,
    bookIds: ['b1', 'b2'], filtered: false, createdDate: '', lastModifiedDate: '',
  }
  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK', json: async () => rl })
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('readLists GETs /readlists with size+sort', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', json: async () => page })
    await komga.readLists()
    const [url, init] = fetchMock.mock.calls[0] as [string, { method?: string }]
    expect(url).toBe('/komga/api/v1/readlists?size=500&sort=name%2Casc')
    expect(init?.method).toBeUndefined()
  })

  it('createReadList POSTs the creation body and returns the DTO', async () => {
    const res = await komga.createReadList({ name: 'To Read', summary: '', ordered: true, bookIds: ['b1'] })
    const [url, init] = fetchMock.mock.calls[0] as [string, { method?: string; body?: string }]
    expect(url).toBe('/komga/api/v1/readlists')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body!)).toEqual({ name: 'To Read', summary: '', ordered: true, bookIds: ['b1'] })
    expect(res).toEqual(rl)
  })

  it('updateReadList PATCHes the full bookIds array', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204, statusText: 'No Content' })
    await komga.updateReadList('r1', { bookIds: ['b1', 'b2', 'b3'] })
    const [url, init] = fetchMock.mock.calls[0] as [string, { method?: string; body?: string }]
    expect(url).toBe('/komga/api/v1/readlists/r1')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body!)).toEqual({ bookIds: ['b1', 'b2', 'b3'] })
  })

  it('deleteReadList DELETEs the list', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204, statusText: 'No Content' })
    await komga.deleteReadList('r1')
    const [url, init] = fetchMock.mock.calls[0] as [string, { method?: string }]
    expect(url).toBe('/komga/api/v1/readlists/r1')
    expect(init.method).toBe('DELETE')
  })
})

// --- Session-expiry handling (the production auth gate) -----------------------
// The server gates /komga/* behind a signed cookie; when it expires mid-session
// the client probes /auth/check once and bounces to /login?next=… only if the
// probe confirms the session is really gone.

describe('handleSessionExpired', () => {
  let nav: Mock<(url: string) => void>

  beforeEach(() => {
    nav = vi.fn()
    resetSessionRedirectForTests()
    setSessionNavigatorForTests(nav)
  })
  afterEach(() => {
    resetSessionRedirectForTests()
    setSessionNavigatorForTests((url) => window.location.assign(url))
    window.history.pushState({}, '', '/')
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const probe = (status: number): typeof fetch =>
    vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/auth/check') return new Response(null, { status })
      throw new TypeError(`unexpected fetch ${String(input)}`)
    }) as unknown as typeof fetch

  it('navigates to /login?next=… when the probe confirms the session is gone', async () => {
    window.history.pushState({}, '', '/series/foo?tab=metadata')
    await handleSessionExpired(probe(401), nav)
    expect(nav).toHaveBeenCalledWith('/login?next=%2Fseries%2Ffoo%3Ftab%3Dmetadata')
  })

  it('does not navigate when the probe says the session is still valid (200)', async () => {
    await handleSessionExpired(probe(200), nav)
    expect(nav).not.toHaveBeenCalled()
  })

  it('does not navigate when there is no auth layer at all (404, dev server)', async () => {
    await handleSessionExpired(probe(404), nav)
    expect(nav).not.toHaveBeenCalled()
  })

  it('does not navigate when the probe itself fails on the network', async () => {
    const boom = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    await handleSessionExpired(boom, nav)
    expect(nav).not.toHaveBeenCalled()
  })

  it('navigates at most once per page load (parallel 401s share one redirect)', async () => {
    await handleSessionExpired(probe(401), nav)
    await handleSessionExpired(probe(401), nav)
    expect(nav).toHaveBeenCalledTimes(1)
  })
})

describe('komga client → session probe wiring', () => {
  let nav: Mock<(url: string) => void>

  beforeEach(() => {
    nav = vi.fn()
    resetSessionRedirectForTests()
    setSessionNavigatorForTests(nav)
  })
  afterEach(() => {
    resetSessionRedirectForTests()
    setSessionNavigatorForTests((url) => window.location.assign(url))
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function routerFor(checkStatus: number): ReturnType<typeof vi.fn> {
    return vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('/komga/')) return new Response(null, { status: 401 })
      if (url === '/auth/check') return new Response(null, { status: checkStatus })
      throw new TypeError(`unexpected fetch ${url}`)
    })
  }

  it('a 401 from a /komga call triggers the probe and one navigation', async () => {
    const router = routerFor(401)
    vi.stubGlobal('fetch', router)

    await expect(komga.libraries()).rejects.toThrow(/401/)
    await vi.waitFor(() => expect(router).toHaveBeenCalledWith('/auth/check', expect.anything()))
    expect(nav).toHaveBeenCalledTimes(1)
    expect(nav).toHaveBeenCalledWith('/login?next=%2F')
  })

  it('a 401 that comes from Komga itself (probe says 200) does not navigate', async () => {
    const router = routerFor(200)
    vi.stubGlobal('fetch', router)

    await expect(komga.libraries()).rejects.toThrow(/401/)
    await vi.waitFor(() => expect(router).toHaveBeenCalledWith('/auth/check', expect.anything()))
    expect(nav).not.toHaveBeenCalled()
  })
})
