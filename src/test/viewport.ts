import { vi } from 'vitest'

/** Force useIsMobile() to a fixed value for a test. Pair with
 *  `afterEach(() => vi.unstubAllGlobals())` to restore the desktop default. */
export function mockViewport(isMobile: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: isMobile,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}
