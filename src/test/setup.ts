import '@testing-library/jest-dom/vitest'

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
