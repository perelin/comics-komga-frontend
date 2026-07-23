// Deep-links into Komga's own web reader and OPDS catalog. Unlike the data path
// (the relative `/komga/...` proxy that hides the origin + API key), these are
// user-facing endpoints the browser reaches directly, so they need the public
// Komga origin. This is the public URL, not a secret — it is derived from
// KOMGA_BASE_URL at build time and exposed to the client as
// `VITE_KOMGA_PUBLIC_URL` (see vite.config.ts). Empty when unconfigured, which
// yields root-relative links rather than leaking any hardcoded host.
function readerBase(): string {
  return import.meta.env.VITE_KOMGA_PUBLIC_URL ?? ''
}

export function komgaReaderUrl(bookId: string): string {
  return `${readerBase()}/book/${bookId}/read`
}

export function komgaSeriesUrl(seriesId: string): string {
  return `${readerBase()}/series/${seriesId}`
}

export function komgaOpdsUrl(): string {
  return `${readerBase()}/opds/v1.2/catalog`
}
