import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_METHOD_ID,
  DEFAULT_SHIPPING_ID,
  EMPTY_ADDRESS,
  makeOrderNumber,
  promoFor,
  shippingFor,
  methodFor,
} from '../lib/checkout'

/**
 * Checkout state — the part of the flow that is not the cart.
 *
 * WHY THIS IS PERSISTED AND THE CART IS TOO
 *
 * The cart has always survived a reload (localStorage, `belanja.cart.v1`).
 * An address that did not would be the worst kind of inconsistency: a shopper
 * reloads on the payment step, their three items are still there, and the
 * form they spent a minute filling is blank. So the delivery details persist
 * alongside the cart, under their own key and their own version.
 *
 * The applied promo code lives here for a related reason. It was local state
 * on the cart page at first, which meant it survived exactly until the shopper
 * pressed "Lanjut ke pembayaran" — the payment page recomputed the total
 * without it, and the discount vanished between the screen where the shopper
 * decided to buy and the screen where they paid. Anything the total depends on
 * has to be in the same place as the total.
 *
 * What is NOT persisted is the order itself. Placing an order is a one-shot
 * event, and a "your order is confirmed" screen that reappears on reload —
 * for an order that was never sent anywhere — would be a lie the browser
 * tells on the app's behalf. The order number lives in memory for exactly as
 * long as the confirmation is on screen.
 */

const CheckoutContext = createContext(null)
const STORAGE_KEY = 'belanja.checkout.v1'

function init() {
  const fallback = {
    address: EMPTY_ADDRESS,
    shippingId: DEFAULT_SHIPPING_ID,
    promoCode: null,
  }
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return fallback
    // Merge rather than trust: a stored address from an older build is
    // missing whatever keys were added since, and a missing key would reach
    // a controlled input as `undefined` and turn it uncontrolled mid-typing.
    return {
      address: { ...EMPTY_ADDRESS, ...(parsed.address ?? {}) },
      // Validate the ids on the way in — a shipping option or promo that no
      // longer exists must not survive a deploy that removed it.
      shippingId: shippingFor(parsed.shippingId).id,
      promoCode: promoFor(parsed.promoCode)?.code ?? null,
    }
  } catch {
    return fallback
  }
}

export function CheckoutProvider({ children }) {
  const [{ address, shippingId, promoCode }, setState] = useState(init)
  const [methodId, setMethodId] = useState(DEFAULT_METHOD_ID)
  const [order, setOrder] = useState(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ address, shippingId, promoCode }))
    } catch {
      /* storage unavailable — checkout still works for this session */
    }
  }, [address, shippingId, promoCode])

  /** Patch one address field. Field-level, so a keystroke re-renders one input. */
  const setAddressField = useCallback((field, value) => {
    setState((s) => ({ ...s, address: { ...s.address, [field]: value } }))
  }, [])

  const setShipping = useCallback((id) => {
    setState((s) => ({ ...s, shippingId: id }))
  }, [])

  const setPromoCode = useCallback((code) => {
    setState((s) => ({ ...s, promoCode: code }))
  }, [])

  /**
   * Take the order. Called only from the payment step, and it is the single
   * place an order number is minted.
   *
   * `lines` and `totals` are passed in rather than read from the cart, so the
   * confirmation shows exactly what was on screen when the button was pressed.
   * Reading the cart again here would let the cart and the receipt disagree if
   * anything changed in between.
   */
  const placeOrder = useCallback(({ lines, totals, methodId: chosenMethod }) => {
    const placed = {
      number: makeOrderNumber(),
      lines,
      totals,
      // The address is snapshotted too, so the confirmation can greet the
      // shopper by name without reading state that the next screen may have
      // already reset.
      address,
      method: methodFor(chosenMethod),
      placedAt: new Date(),
    }
    setOrder(placed)
    return placed
  }, [address])

  /** Drop the placed order — called when the shopper leaves the done step. */
  const clearOrder = useCallback(() => setOrder(null), [])

  const value = useMemo(
    () => ({
      address,
      shippingId,
      shipping: shippingFor(shippingId),
      promoCode,
      methodId,
      method: methodFor(methodId),
      order,
      setAddressField,
      setShipping,
      setPromoCode,
      setMethodId,
      placeOrder,
      clearOrder,
    }),
    [
      address,
      shippingId,
      promoCode,
      methodId,
      order,
      setAddressField,
      setShipping,
      setPromoCode,
      placeOrder,
      clearOrder,
    ]
  )

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>
}

export function useCheckout() {
  const ctx = useContext(CheckoutContext)
  if (!ctx) throw new Error('useCheckout must be used inside <CheckoutProvider>')
  return ctx
}

/** Re-exported so a page can validate a typed code without importing two files. */
export { promoFor }
