import { useEffect, useState } from 'react'

/**
 * A ~30-line hash router.
 *
 * Hash routing rather than history API on purpose: the built site then works
 * when opened straight from the filesystem (`dist/index.html`), which matters
 * when you demo a project from a USB stick or a local folder — no server, no
 * 404s on refresh.
 *
 * Routes are just strings: '#/', '#/katalog', '#/produk/kaos-katun-berat'.
 */

const read = () => {
  const raw = window.location.hash.replace(/^#/, '')
  return raw.startsWith('/') ? raw : '/'
}

export function useRoute() {
  const [path, setPath] = useState(read)

  useEffect(() => {
    const onChange = () => {
      setPath(read())
      // Land at the top of the new page — a client-side route change would
      // otherwise keep the previous scroll position.
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return path
}

export const navigate = (to) => {
  const next = to.startsWith('/') ? to : `/${to}`
  if (read() === next) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  window.location.hash = next
}

/**
 * Parse a path into a route descriptor.
 * Returns { name, key, params } — the app switches on `name`, and animates
 * on `key`.
 *
 * `key` is the page's IDENTITY, which is not the same thing as its path. Two
 * paths that render the same page must share a key, or the router will treat
 * switching a filter as navigating to a new page. Catalog carries its
 * category in the query string, so every category would otherwise get its own
 * key and remount the page on each pill tap — replaying the page transition
 * and resetting the search box.
 */
export function matchRoute(path) {
  const [pathname, query = ''] = path.split('?')
  const parts = pathname.split('/').filter(Boolean)

  if (parts.length === 0) return { name: 'home', key: 'home', params: {} }
  if (parts[0] === 'katalog') {
    return {
      name: 'catalog',
      key: 'catalog',
      params: { kategori: parseQuery(query).kategori ?? 'semua' },
    }
  }
  if (parts[0] === 'produk' && parts[1]) {
    return { name: 'product', key: `product:${parts[1]}`, params: { id: parts[1] } }
  }
  if (parts[0] === 'keranjang') return { name: 'cart', key: 'cart', params: {} }
  if (parts[0] === 'pembayaran') return { name: 'payment', key: 'payment', params: {} }
  return { name: 'notfound', key: 'notfound', params: {} }
}

/** Read the query portion of the current hash as a plain object. */
export function parseQuery(query) {
  const out = {}
  for (const [k, v] of new URLSearchParams(query)) out[k] = v
  return out
}
