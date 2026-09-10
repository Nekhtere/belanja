/** Format an integer rupiah amount as "Rp189.000". */
const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export const formatPrice = (value) => rupiah.format(value)

/** Percentage saved, rounded — used on sale badges. */
export const discountPercent = (price, originalPrice) =>
  originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0

/**
 * A rating as one decimal, in Indonesian.
 *
 * `toFixed(1)` would print "4.3", and the rest of this page is in Indonesian,
 * where the decimal separator is a comma. A stray period reads as a typo in a
 * way it would not on an English page — and it sits directly beside the star
 * row, where every inconsistency is noticed.
 */
const rating = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export const formatRating = (value) => rating.format(value)
