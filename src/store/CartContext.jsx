import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'

/**
 * Cart state.
 *
 * A reducer keeps every mutation in one place and makes the "same product +
 * same size + same colour" merge rule explicit rather than scattered across
 * call sites.
 *
 * Line identity is a composite key, because the same shirt in M/black and
 * L/white are two different lines and must not collapse into one.
 */

const CartContext = createContext(null)
const STORAGE_KEY = 'belanja.cart.v1'

const lineKey = (item) => `${item.id}::${item.size ?? ''}::${item.color ?? ''}`

function reducer(state, action) {
  switch (action.type) {
    case 'add': {
      const key = lineKey(action.item)
      const existing = state.find((l) => lineKey(l) === key)
      if (existing) {
        return state.map((l) =>
          lineKey(l) === key ? { ...l, qty: Math.min(l.qty + action.item.qty, 99) } : l
        )
      }
      return [...state, { ...action.item, key }]
    }

    case 'setQty': {
      // Dropping to zero removes the line, so the UI never shows an empty row.
      if (action.qty < 1) return state.filter((l) => l.key !== action.key)
      return state.map((l) =>
        l.key === action.key ? { ...l, qty: Math.min(action.qty, 99) } : l
      )
    }

    case 'remove':
      return state.filter((l) => l.key !== action.key)

    case 'clear':
      return []

    default:
      return state
  }
}

/** Read the persisted cart, tolerating a corrupt or absent value. */
function init() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Re-derive the key rather than trusting what was stored — a stale or
    // tampered payload must not be able to produce two lines with one key.
    return parsed
      .filter((l) => l && typeof l.id === 'string' && Number.isFinite(l.qty))
      .map((l) => ({ ...l, key: lineKey(l) }))
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [lines, dispatch] = useReducer(reducer, undefined, init)

  // Persist on every change. Wrapped because Safari in private mode throws.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      /* storage unavailable — the cart still works for this session */
    }
  }, [lines])

  const addItem = useCallback((item) => dispatch({ type: 'add', item }), [])
  const setQty = useCallback((key, qty) => dispatch({ type: 'setQty', key, qty }), [])
  const removeItem = useCallback((key) => dispatch({ type: 'remove', key }), [])
  const clear = useCallback(() => dispatch({ type: 'clear' }), [])

  const value = useMemo(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0)
    const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0)
    return { lines, count, subtotal, addItem, setQty, removeItem, clear }
  }, [lines, addItem, setQty, removeItem, clear])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
