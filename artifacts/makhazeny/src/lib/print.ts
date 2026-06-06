/**
 * Print HTML content directly inside the app (works in browser and packaged Electron).
 * Avoids window.open which Electron blocks in production builds.
 */
export function printHtml(html: string, title = 'Print'): boolean {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('title', title)
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none;visibility:hidden;'
  document.body.appendChild(iframe)

  const win = iframe.contentWindow
  const doc = win?.document
  if (!win || !doc) {
    document.body.removeChild(iframe)
    return false
  }

  doc.open()
  doc.write(html)
  doc.close()

  const cleanup = () => {
    if (iframe.parentNode) {
      document.body.removeChild(iframe)
    }
  }

  win.focus()
  // Allow layout to settle before opening the print dialog.
  setTimeout(() => {
    win.print()
    setTimeout(cleanup, 1000)
  }, 300)

  return true
}
