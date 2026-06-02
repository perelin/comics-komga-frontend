// Deep-links into Komga's own web reader. Unlike the data path (the relative
// `/komga/...` proxy that hides the origin + API key), the reader is a
// user-facing app the user logs into directly, so it needs the public origin.
// This is the public domain, not a secret.
export const KOMGA_READER_BASE = 'https://komga.p2lab.com'

export function komgaReaderUrl(bookId: string): string {
  return `${KOMGA_READER_BASE}/book/${bookId}/read`
}

export function komgaSeriesUrl(seriesId: string): string {
  return `${KOMGA_READER_BASE}/series/${seriesId}`
}
