/**
 * Checkout arithmetic — the one place a payable total is computed.
 *
 * WHY THIS FILE EXISTS AT ALL
 *
 * The cart already knew its subtotal: it was a `reduce` inline in
 * CartContext.jsx. Adding shipping, a promo and a total gives three more
 * numbers that must agree with each other and with that subtotal — and the
 * failure mode is not a crash, it is a total that is quietly Rp25.000 off
 * because the summary panel summed something the CTA did not.
 *
 * So the sum lives here once, as pure functions over a plain list of lines.
 * `subtotalOf` is what CartContext now calls too, which is the point: the
 * drawer's "Subtotal" line and the checkout's "Total" cannot drift, because
 * there is only one implementation of the addition.
 *
 * Money is whole rupiah, like every price in this project. See the header of
 * data/catalog.js for why it is not a float.
 *
 * NOTHING HERE TALKS TO A SERVER. It computes what a total *would* be.
 */

/**
 * Delivery is free from here up. This is not a growth hack bolted on — it is
 * the reason the cart page has something to say that the drawer does not, and
 * it gives the shopper a decision to make at the moment they can act on it.
 */
export const FREE_SHIPPING_FROM = 500000

/**
 * Delivery options. `cost: 0` for pickup is a real zero, not a placeholder —
 * there is no courier to pay.
 *
 * The ids are stable and are what CheckoutContext stores; the labels are what
 * the shopper reads. Keeping them apart means renaming "Reguler" does not
 * silently invalidate a saved selection.
 */
export const SHIPPING = [
  {
    id: 'reguler',
    label: 'Reguler',
    eta: '3–5 hari kerja',
    carrier: 'JNE · SiCepat',
    cost: 25000,
  },
  {
    id: 'cepat',
    label: 'Cepat',
    eta: '1–2 hari kerja',
    carrier: 'AnterAja · Ninja',
    cost: 45000,
  },
  {
    id: 'ambil',
    label: 'Ambil di toko',
    eta: 'siap dalam 2 jam',
    carrier: 'Batam Centre',
    cost: 0,
  },
]

export const DEFAULT_SHIPPING_ID = 'reguler'

/** Look up one option, falling back rather than returning undefined. */
export function shippingFor(id) {
  return SHIPPING.find((s) => s.id === id) ?? SHIPPING.find((s) => s.id === DEFAULT_SHIPPING_ID)
}

/**
 * One demo promo code.
 *
 * Capped, because "10% off" with no ceiling is how a demo accidentally
 * promises Rp125.000 off a watch. The cap is also the more interesting case
 * to get right, and the verify script checks it at both ends.
 *
 * Case-insensitive on input: a shopper who types "rupa10" has used the code,
 * and rejecting it on case is the kind of pedantry that loses a sale.
 */
export const PROMOS = {
  RUPA10: { percent: 10, max: 100000, label: 'Potongan 10%, maksimal Rp100.000' },
}

/** The promo for a typed code, or null. Normalises case and trims. */
export function promoFor(code) {
  const key = String(code ?? '').trim().toUpperCase()
  return key && PROMOS[key] ? { code: key, ...PROMOS[key] } : null
}

/**
 * The subtotal. THE definition — CartContext imports this rather than
 * repeating the reduce, so the drawer and the checkout agree by construction.
 */
export function subtotalOf(lines) {
  return lines.reduce((n, l) => n + l.price * l.qty, 0)
}

/** The rupiah amount a promo takes off, capped, never exceeding the subtotal. */
export function discountFor(promo, subtotal) {
  if (!promo) return 0
  const raw = Math.round((subtotal * promo.percent) / 100)
  // Two ceilings: the promo's own cap, and the subtotal itself. A discount
  // larger than the order would produce a negative total, i.e. the store
  // paying the shopper — which is not a thing that can happen.
  return Math.min(raw, promo.max, subtotal)
}

/**
 * Everything the summary needs, from one pass.
 *
 * Free delivery is decided on the SUBTOTAL, not on the discounted amount:
 * a promo should not be able to push an order back under the threshold and
 * resurrect a shipping charge the shopper had already earned. That is the
 * kind of interaction nobody designs on purpose and everybody notices.
 */
export function totalsFor(lines, { shippingId, promoCode } = {}) {
  const subtotal = subtotalOf(lines)
  const promo = promoFor(promoCode)
  const discount = discountFor(promo, subtotal)
  const option = shippingFor(shippingId)

  // Pickup costs nothing either way; the threshold only waives a courier.
  const freeShipping = option.cost > 0 && subtotal >= FREE_SHIPPING_FROM
  const shipping = freeShipping ? 0 : option.cost

  return {
    subtotal,
    promo,
    discount,
    option,
    freeShipping,
    shipping,
    total: subtotal - discount + shipping,
    // How much more would unlock free delivery. Zero once it is unlocked —
    // the UI shows a nudge only while this is positive, so it cannot say
    // "add Rp0 more".
    remainingForFreeShipping:
      option.cost > 0 && subtotal < FREE_SHIPPING_FROM ? FREE_SHIPPING_FROM - subtotal : 0,
  }
}

/**
 * Whether the delivery details are complete enough to take a payment.
 *
 * One rule, used by both the cart page (to enable its button) and the payment
 * page (to decide whether to bounce the shopper back). If the two had their
 * own copies of this check, the payment page would eventually accept an order
 * the cart page would not have let through.
 *
 * Postcode is deliberately not required — it is optional in Indonesian
 * addressing in a way it is not in, say, the UK, and demanding it is friction
 * with no payoff.
 */
export function addressComplete(address) {
  if (!address) return false
  return ['name', 'phone', 'street', 'city'].every((k) => String(address[k] ?? '').trim().length > 0)
}

export const EMPTY_ADDRESS = {
  name: '',
  phone: '',
  street: '',
  city: '',
  postcode: '',
  note: '',
}

/**
 * A plausible-looking order reference, derived from the clock.
 *
 * Deliberately NOT random: given the same time it produces the same string,
 * which makes it reproducible in a test and impossible to mistake for a real
 * identifier issued by a real system. Nothing stores it — see the success
 * panel, which says so.
 */
export function makeOrderNumber(now = new Date()) {
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const secsOfDay = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
  return `RUPA-${yy}${mm}-${String(secsOfDay % 10000).padStart(4, '0')}`
}

/**
 * Payment methods.
 *
 * WHY THERE IS NO CARD OPTION, AND NO QR
 *
 * A card form in a demo is a field asking a stranger to type a real card
 * number into something that will never process it. There is no version of
 * that which is fine, so the method is simply absent rather than disabled —
 * a greyed-out card field still puts a card number field in front of someone.
 *
 * The same reasoning rules out a QR code. A QR that scans to a real payment
 * page is a liability; one that scans to nothing is theatre. Neither is worth
 * shipping, so payment instructions here are text, and the account number is
 * visibly fake.
 *
 * All three remaining methods need no credential at all.
 */
export const METHODS = [
  {
    id: 'va',
    label: 'Transfer bank',
    hint: 'Virtual Account, dibayar dari m-banking',
  },
  {
    id: 'ewallet',
    label: 'E-wallet',
    hint: 'GoPay, OVO, atau DANA',
  },
  {
    id: 'cod',
    label: 'Bayar di tempat',
    hint: 'Kurir menagih saat barang tiba',
  },
]

export const DEFAULT_METHOD_ID = 'va'

export function methodFor(id) {
  return METHODS.find((m) => m.id === id) ?? METHODS[0]
}

/**
 * The demo account number.
 *
 * Written out rather than generated. A randomly generated VA would look
 * exactly like a real one, and the entire point is that nobody should be able
 * to mistake this for somewhere to send money. Four zero groups cannot be
 * confused for an account, and the UI labels it as an example beside it.
 */
export const DEMO_VA = '8808 0000 0000 0000'
