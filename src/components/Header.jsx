import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useCart } from '../store/CartContext'
import { navigate } from '../lib/router'
import { CATEGORIES } from '../data/catalog'
import { EASE, SPRING } from '../lib/motion'

const LINKS = [
  { label: 'Katalog', to: '/katalog' },
  { label: 'Pakaian', to: '/katalog?kategori=pakaian' },
  { label: 'Tas', to: '/katalog?kategori=tas' },
  { label: 'Parfum', to: '/katalog?kategori=parfum' },
]

export default function Header({ onOpenCart, route }) {
  const { count } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const [condensed, setCondensed] = useState(false)

  // Close the mobile menu whenever the route changes, so tapping a link
  // doesn't leave the panel covering the page it just navigated to.
  useEffect(() => {
    setMenuOpen(false)
  }, [route])

  // The bar tightens once you leave the top of the page. Passive listener +
  // a boolean guard: the scroll handler runs on every frame, so it must not
  // do anything but compare a number.
  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock the page behind the open menu.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  // Escape closes it — expected behaviour, and free to support.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const go = (to) => (e) => {
    e.preventDefault()
    navigate(to)
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Lompat ke konten
      </a>

      {/* The glass bar floats free of the viewport edge rather than sitting
          flush against it — it reads as a pane laid over the page, which is
          the whole point, and the gap lets the mesh show through behind it.
          It rides inside .wrap so it lines up with every section below. */}
      <header className="sticky top-0 z-50 pt-3 md:pt-4">
        <div className="wrap">
          <motion.div
            animate={{
              paddingTop: condensed ? 6 : 10,
              paddingBottom: condensed ? 6 : 10,
              borderRadius: condensed ? 999 : 20,
            }}
            transition={{ duration: 0.4, ease: EASE }}
            /* py-2.5 is the pre-animation value: it gives the first paint the
               same 10px the animation starts from, so the bar does not jump
               when Motion takes over. */
            className="glass-strong flex items-center justify-between gap-6 px-4 py-2.5 md:px-5"
          >
          {/* wordmark. The padding is load-bearing: at 22px the bare text was
              under the 24px minimum target size, and a logo is the one link
              everyone expects to be able to hit. */}
          <a
            href="#/"
            onClick={go('/')}
            className="type-h3 -mx-2 shrink-0 rounded-full px-2 py-2 text-[1.0625rem] tracking-[-0.04em] transition-colors duration-200 hover:bg-ink/5"
          >
            RUPA
          </a>

          {/* desktop nav */}
          <nav aria-label="Kategori" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <a
                    href={`#${l.to}`}
                    onClick={go(l.to)}
                    className="ul-hover inline-block px-3 py-1.5 text-[0.8125rem] text-muted transition-colors duration-200 hover:text-ink"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* actions */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenCart}
              className="relative flex h-10 items-center gap-2 rounded-full px-3 text-[0.8125rem] transition-colors duration-200 hover:bg-ink/5"
              aria-label={`Keranjang, ${count} barang`}
            >
              <span>Keranjang</span>
              {/* AnimatePresence + popLayout so the count badge springs in the
                  first time something is added, and the row reflows around it. */}
              <AnimatePresence mode="popLayout" initial={false}>
                {count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={SPRING}
                    className="tnum grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[0.6875rem] font-medium text-paper"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="grid size-10 place-items-center rounded-full transition-colors duration-200 hover:bg-ink/5 md:hidden"
              aria-expanded={menuOpen}
              aria-controls="menu-mobile"
              aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
            >
              <span aria-hidden="true" className="relative block h-3 w-5">
                <span
                  className={`absolute left-0 block h-px w-5 bg-ink transition-transform duration-300 ${
                    menuOpen ? 'top-1.5 rotate-45' : 'top-0'
                  }`}
                />
                <span
                  className={`absolute left-0 block h-px w-5 bg-ink transition-transform duration-300 ${
                    menuOpen ? 'top-1.5 -rotate-45' : 'top-3'
                  }`}
                />
              </span>
            </button>
          </div>
          </motion.div>
        </div>
      </header>

      {/* mobile panel — animated in and out rather than toggled with `hidden`,
          so the sheet slides down instead of appearing */}
      {/* The wrapper is the motion child so the exit animation actually runs —
          a plain <>…</> fragment is not a motion component and AnimatePresence
          cannot defer its unmount. See the note in CartDrawer.jsx. */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="menu"
            initial="closed"
            animate="open"
            exit="closed"
            className="md:hidden"
          >
            <motion.button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Tutup menu"
              variants={{ closed: { opacity: 0 }, open: { opacity: 1 } }}
              transition={{ duration: 0.3, ease: EASE }}
              className="fixed inset-0 z-40 cursor-default bg-ink/10 backdrop-blur-[2px]"
            />
            <motion.div
              id="menu-mobile"
              variants={{ closed: { opacity: 0, y: -16 }, open: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.4, ease: EASE }}
              className="glass-strong fixed inset-x-3 top-[4.75rem] z-40 max-h-[70dvh] overflow-y-auto rounded-[24px] p-2"
            >
              <nav aria-label="Menu">
                <ul>
                  {CATEGORIES.map((c) => {
                    const to = `/katalog${c.id === 'semua' ? '' : `?kategori=${c.id}`}`
                    return (
                      <li key={c.id}>
                        <a
                          href={`#${to}`}
                          onClick={go(to)}
                          className="flex min-h-14 items-center justify-between rounded-2xl px-4 text-[1.0625rem] transition-colors duration-200 hover:bg-ink/5"
                        >
                          {c.label}
                          <span aria-hidden="true" className="text-faint">
                            →
                          </span>
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
