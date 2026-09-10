import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { reviewsFor, summarize } from '../data/reviews'

/**
 * Reviews written during this session.
 *
 * This exists for one reason, and it is a bug that was already shipped once in
 * this feature: the score in the buy panel and the list under the page were
 * reading from two different places. The list rendered session reviews; the
 * score only counted the stored ones. Write a 5-star review and the page shows
 * it, while the number above it does not move — a page that contradicts itself
 * two inches apart.
 *
 * So both read from here. `allFor(productId)` is the single list, and
 * `summaryFor(productId)` summarises exactly that list. One source, derived
 * once — the same rule as the stock answer in data/chat.js.
 *
 * NOT PERSISTED, deliberately. The cart survives a reload because a cart is
 * something you come back to; a review that reappeared after a refresh would
 * imply it had been submitted somewhere, which is the one thing this demo
 * cannot do. It lives in memory and goes when the tab does.
 */

const ReviewsContext = createContext(null)

export function ReviewsProvider({ children }) {
  // productId -> array of reviews, newest first.
  const [mine, setMine] = useState({})

  const addReview = useCallback((productId, review) => {
    setMine((prev) => ({
      ...prev,
      [productId]: [{ ...review, mine: true }, ...(prev[productId] ?? [])],
    }))
  }, [])

  const value = useMemo(() => {
    const allFor = (productId) => [...(mine[productId] ?? []), ...reviewsFor(productId)]
    return {
      allFor,
      summaryFor: (productId) => summarize(allFor(productId)),
      addReview,
    }
  }, [mine, addReview])

  return <ReviewsContext.Provider value={value}>{children}</ReviewsContext.Provider>
}

export function useReviews() {
  const ctx = useContext(ReviewsContext)
  if (!ctx) throw new Error('useReviews must be used inside <ReviewsProvider>')
  return ctx
}
