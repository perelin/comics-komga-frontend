import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// The public Komga origin (for reader/OPDS deep-links) is build-time-injected
// from KOMGA_BASE_URL in the real app (see vite.config.ts). Under test that
// define is skipped, so pin a stable value here for deterministic URL specs.
vi.stubEnv('VITE_KOMGA_PUBLIC_URL', 'https://komga.test')

// Node 26 exposes its own experimental `localStorage` on global (as undefined),
// which causes vitest/jsdom's populateGlobal to skip copying jsdom's localStorage.
// vitest sets global.jsdom = dom after setup, so we can read the real descriptor
// from the jsdom Window object and redefine it on globalThis.
const _jsdom = (globalThis as Record<string, unknown>)['jsdom'] as { window: Window } | undefined
if (_jsdom?.window) {
  const _win = _jsdom.window
  const _ls = Object.getOwnPropertyDescriptor(_win, 'localStorage')
  const _ss = Object.getOwnPropertyDescriptor(_win, 'sessionStorage')
  if (_ls) Object.defineProperty(globalThis, 'localStorage', { ..._ls, configurable: true })
  if (_ss) Object.defineProperty(globalThis, 'sessionStorage', { ..._ss, configurable: true })
}

// Base UI (@base-ui/react/menu, used by our dropdown-menu) relies on Pointer
// Capture + scrollIntoView, which jsdom doesn't implement. Polyfill as no-ops
// so menus open under test.
const _proto = globalThis.Element?.prototype as unknown as Record<string, unknown>
if (_proto) {
  _proto.hasPointerCapture ??= () => false
  _proto.releasePointerCapture ??= () => {}
  _proto.setPointerCapture ??= () => {}
  _proto.scrollIntoView ??= () => {}
}

// jsdom has no matchMedia. Default every test to the desktop layout
// (matches:false). Mobile tests override per-test via mockViewport()
// in src/test/viewport.ts (call vi.unstubAllGlobals() in afterEach).
if (typeof globalThis.matchMedia !== 'function') {
  globalThis.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof globalThis.matchMedia
}
