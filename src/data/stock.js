/**
 * Stock levels — dummy data, kept apart from the catalogue on purpose.
 *
 * In a real store these two things do not live together. The catalogue is
 * written by whoever decides what the shop sells, and changes maybe monthly.
 * Stock is written by a warehouse, and changes hourly. Keeping stock in
 * `catalog.js` would suggest they are the same kind of fact, which is exactly
 * the mistake this feature exists to paper over.
 *
 * WHY THIS FILE HAS A `checkedDaysAgo` AT ALL
 *
 * The scenario that prompted this feature: an item sells out, nobody updates
 * the site, and the page keeps promising stock that no longer exists. The
 * naive fix is to display a number — "stok: 24" — which is worse, because a
 * bare number carries no hint that it might be days old. The reader has no way
 * to tell a number refreshed this morning from one refreshed last week, so
 * they trust both equally.
 *
 * So every level carries its own age, and the page shows it. A number with its
 * timestamp is honest; a number without one is a claim. That is also why the
 * UI treats a stale reading as a reason to offer the chat rather than as a
 * reason to hide the number.
 *
 * Note the direction of the error. Stale data can be wrong in both ways:
 * a product marked "habis" may have been restocked since (see `sling-bag`),
 * and a product marked "tersedia" may have sold out. The copy in the UI is
 * written to acknowledge both, because a shopper who is told "habis" and then
 * finds it in stock is just as annoyed as the reverse.
 *
 * `checkedDaysAgo` is a plain integer rather than a date. Nothing here sorts
 * or compares dates, and a real Date would drag in locale formatting for a
 * string the UI renders as "5 hari lalu" anyway.
 */

/** Sentinel for "we do not track this" — distinct from zero, which means sold out. */
const UNKNOWN = { qty: null, checkedDaysAgo: null }

const STOCK = {
  'kaos-katun-berat': { qty: 24, checkedDaysAgo: 0 },
  'kemeja-linen': { qty: 8, checkedDaysAgo: 1 },
  // Deliberately the interesting case: low, and the reading is old enough that
  // "sisa 2" may already be "habis".
  'jaket-twill': { qty: 2, checkedDaysAgo: 5 },
  'dress-midi': { qty: 6, checkedDaysAgo: 2 },
  'celana-pleated': { qty: 11, checkedDaysAgo: 0 },
  'tote-kanvas': { qty: 15, checkedDaysAgo: 1 },
  'ransel-daypack': { qty: 4, checkedDaysAgo: 3 },
  // Sold out — and the reading is six days old, so it may have been restocked
  // since. This is the mirror image of the scenario above.
  'sling-bag': { qty: 0, checkedDaysAgo: 6 },
  'parfum-cedar': { qty: 9, checkedDaysAgo: 1 },
  'parfum-neroli': { qty: 7, checkedDaysAgo: 2 },
  'jam-tangan-minimal': { qty: 3, checkedDaysAgo: 0 },
  'topi-kanvas': { qty: 18, checkedDaysAgo: 2 },
}

/** A reading older than this is shown as possibly out of date. */
export const STALE_AFTER_DAYS = 3

/** How low the count has to be before the page says so. */
export const LOW_STOCK_AT = 3

/**
 * Stock for one product, always shaped the same way so callers never have to
 * guard against `undefined` — an untracked product is a normal state here,
 * not a missing record.
 */
export function stockFor(productId) {
  const s = STOCK[productId] ?? UNKNOWN
  return {
    qty: s.qty,
    checkedDaysAgo: s.checkedDaysAgo,
    tracked: s.qty !== null,
    stale: s.checkedDaysAgo !== null && s.checkedDaysAgo >= STALE_AFTER_DAYS,
    soldOut: s.qty === 0,
    low: s.qty !== null && s.qty > 0 && s.qty <= LOW_STOCK_AT,
  }
}

/**
 * What the buy panel should say. Returned as a label plus a tone rather than a
 * finished sentence, because the same state is worded differently in the buy
 * panel and in the chat, and a single string would force one of them to be
 * wrong.
 */
export function stockLabel(stock) {
  if (!stock.tracked) return { label: 'Belum dicek', tone: 'unknown' }
  if (stock.soldOut) return { label: 'Habis', tone: 'out' }
  if (stock.low) return { label: `Sisa ${stock.qty}`, tone: 'low' }
  return { label: 'Tersedia', tone: 'in' }
}

/** "hari ini" / "kemarin" / "5 hari lalu" — the age of the reading. */
export function stockAge(stock) {
  if (stock.checkedDaysAgo === null) return 'belum pernah dicek'
  if (stock.checkedDaysAgo === 0) return 'dicek hari ini'
  if (stock.checkedDaysAgo === 1) return 'dicek kemarin'
  return `dicek ${stock.checkedDaysAgo} hari lalu`
}
