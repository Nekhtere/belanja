import { useEffect } from 'react'

/**
 * Set the document title per page.
 *
 * A client-rendered store is a single HTML file, so without this every route
 * shares one title — which is bad for bookmarks, browser history, and anyone
 * with more than one tab open.
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}
