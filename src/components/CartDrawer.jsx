import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useCart } from '../store/CartContext'
import { formatPrice } from '../lib/format'
import ProductPhoto from './ProductPhoto'
import { findProduct } from '../data/catalog'
import { navigate } from '../lib/router'
import { EASE, SPRING } from '../lib/motion'

export default function CartDrawer({ open, onClose }) {
  const { lines, subtotal, setQty, removeItem, count } = useCart()
  const closeRef = useRef(null)

  // Escape to close, and lock the page behind the panel.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  // Move focus into the panel when it opens so keyboard users are not left
  // behind on the page underneath.
  useEffect(() => {
    if (open) closeRef.current?.focus()
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        /* AnimatePresence can only play an exit animation on a MOTION child,
           so the conditional top-level element has to be the motion element.
           The wrapper itself animates nothing — it exists to hold the variant
           label and propagate "closed" down to the two children, which each
           carry their own transition. */
        <motion.div
          key="cart"
          initial="closed"
          animate="open"
          exit="closed"
          className="fixed inset-0 z-[60]"
          role="dialog"
          aria-modal="true"
          aria-label="Keranjang"
        >
          {/* scrim */}
          <motion.button
            type="button"
            onClick={onClose}
            aria-label="Tutup keranjang"
            variants={{ closed: { opacity: 0 }, open: { opacity: 1 } }}
            transition={{ duration: 0.35, ease: EASE }}
            className="absolute inset-0 cursor-default bg-ink/20 backdrop-blur-[3px]"
          />

          {/* The panel is a sheet of glass floating a little off the edge —
              the gap is what sells it as a layer rather than a sidebar. */}
          <motion.div
            variants={{ closed: { x: '104%' }, open: { x: 0 } }}
            transition={{ duration: 0.5, ease: EASE }}
            className="glass-strong absolute inset-y-2 right-2 flex w-[calc(100%-1rem)] max-w-[26rem] flex-col overflow-hidden rounded-[24px] md:inset-y-3 md:right-3 md:w-[26rem]"
          >
            <div className="flex items-center justify-between border-b border-ink/5 px-5 py-4">
              <h2 className="type-h3 text-[1rem]">
                Keranjang{count > 0 && <span className="tnum type-muted"> · {count}</span>}
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="grid size-10 place-items-center rounded-full transition-colors duration-200 hover:bg-ink/5"
                aria-label="Tutup"
              >
                <span aria-hidden="true" className="text-lg leading-none">
                  ×
                </span>
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <p className="type-muted">Keranjang masih kosong.</p>
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    navigate('/katalog')
                  }}
                  className="btn btn-ink"
                >
                  Lihat katalog
                </button>
              </div>
            ) : (
              <>
                {/* layout on the rows means removing one slides the others up
                    instead of snapping the list — the difference between a
                    list that updates and one that animates. */}
                <ul className="flex-1 overflow-y-auto px-3 py-1">
                  <AnimatePresence initial={false}>
                    {lines.map((line) => (
                      <motion.li
                        key={line.key}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 40 }}
                        transition={{ duration: 0.35, ease: EASE, layout: SPRING }}
                        className="flex gap-4 px-2 py-4"
                      >
                        {/* The thumbnail is looked up from the catalogue by id
                            rather than stored on the line. A stored URL would
                            be a stale absolute path after the next build, and
                            the saved cart would render broken thumbnails —
                            the id survives a rebuild, a hashed filename does
                            not. */}
                        <div className="tile size-20 shrink-0 rounded-[18px]">
                          <ProductPhoto
                            photo={findProduct(line.id)?.photo}
                            alt=""
                            sizes="80px"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-[0.875rem] font-medium leading-snug">{line.name}</p>
                            <button
                              type="button"
                              onClick={() => removeItem(line.key)}
                              className="shrink-0 text-[0.75rem] text-faint transition-colors duration-200 hover:text-ink"
                              aria-label={`Hapus ${line.name}`}
                            >
                              Hapus
                            </button>
                          </div>

                          {(line.size || line.color) && (
                            <p className="mt-0.5 text-[0.75rem] type-muted">
                              {[line.size, line.colorName].filter(Boolean).join(' · ')}
                            </p>
                          )}

                          <div className="mt-2.5 flex items-center justify-between gap-3">
                            <div className="flex items-center rounded-full border border-line bg-paper/70">
                              <button
                                type="button"
                                onClick={() => setQty(line.key, line.qty - 1)}
                                className="grid size-8 place-items-center rounded-full text-[0.9375rem] transition-colors duration-200 hover:bg-tile"
                                aria-label={`Kurangi jumlah ${line.name}`}
                              >
                                −
                              </button>
                              <span className="tnum w-8 text-center text-[0.8125rem]" aria-live="polite">
                                {line.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => setQty(line.key, line.qty + 1)}
                                className="grid size-8 place-items-center rounded-full text-[0.9375rem] transition-colors duration-200 hover:bg-tile"
                                aria-label={`Tambah jumlah ${line.name}`}
                              >
                                +
                              </button>
                            </div>

                            <p className="tnum text-[0.875rem] font-medium">
                              {formatPrice(line.price * line.qty)}
                            </p>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>

                <div className="border-t border-ink/5 px-5 py-5">
                  <div className="flex items-baseline justify-between">
                    <span className="type-label">Subtotal</span>
                    <span className="tnum type-h3 text-[1.125rem]">{formatPrice(subtotal)}</span>
                  </div>
                  <p className="mt-1.5 text-[0.75rem] type-muted">
                    Ongkos kirim dihitung di halaman keranjang.
                  </p>

                  {/* The drawer's job is a quick look; the cart page is where
                      the order is actually assembled. This button used to be a
                      dead stub — it now goes somewhere, which is the minimum a
                      button owes the person pressing it. */}
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      navigate('/keranjang')
                    }}
                    className="btn btn-ink btn-block mt-4"
                  >
                    Lihat keranjang &amp; bayar
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-2 w-full py-2 text-[0.8125rem] type-muted transition-colors duration-200 hover:text-ink"
                  >
                    Lanjut belanja
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
