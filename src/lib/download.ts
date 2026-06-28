/** Trigger a browser file download for a URL without navigating the page.
 *  Used where a real `<a download>` can't live — e.g. nested inside another
 *  anchor (BookCard) or inside a menu item. The server's Content-Disposition
 *  decides the saved filename, so the `download` attribute is left empty. */
export function triggerDownload(url: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = ''
  document.body.appendChild(a)
  a.click()
  a.remove()
}
