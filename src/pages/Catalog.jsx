import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import ProductCard from '../components/ProductCard'
import { PRODUCTS, CATEGORIES } from '../data/catalog'
import { navigate } from '../lib/router'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { EASE, riseIn, stagger } from '../lib/motion'

const SORTS = [
  { id: 'unggulan', label: 'Unggulan' },
  { id: 'murah', label: 'Harga terendah' },
  { id: 'mahal', label: 'Harga tertinggi' },
  { id: 'baru', label: 'Terbaru' },
]

export default function Catalog({ kategori = 'semua' }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('unggulan')

  const active = CATEGORIES.find((c) => c.id === kategori) ?? CATEGORIES[0]
  useDocumentTitle(
    active.id === 'semua' ? 'Katalog — RUPA' : `${active.label} — RUPA`
  )

  // Filtering and sorting are derived, not stored. Keeping one source of truth
  // (the raw list plus the controls) avoids the stale-state bugs you get from
  // syncing a filtered copy into state.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()

    let list = PRODUCTS.filter((p) => active.id === 'semua' || p.category === active.id)

    if (q) {
      list = list.filter((p) =>
        [p.name, p.material, p.category, p.blurb].join(' ').toLowerCase().includes(q)
      )
    }

    switch (sort) {
      case 'murah':
        return [...list].sort((a, b) => a.price - b.price)
      case 'mahal':
        return [...list].sort((a, b) => b.price - a.price)
      case 'baru':
        // Tagged "Baru" first, otherwise keep the authored order.
        return [...list].sort((a, b) => (b.tag === 'Baru') - (a.tag === 'Baru'))
      default:
        return list
    }
  }, [active.id, query, sort])

  return (
    <div className="wrap pt-10 md:pt-14">
      {/* ---- head ---- */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="type-label">Katalog</p>
          <h1 className="type-h2 mt-2">{active.label}</h1>
        </div>
        <p className="tnum text-[0.8125rem] type-muted" aria-live="polite">
          {results.length} barang
        </p>
      </div>

      {/* ---- controls ----
          A floating glass bar. It sticks under the header so the filters stay
          reachable on a long grid — the one place on this page where glass
          earns its cost, because it genuinely overlaps content. */}
      <div className="glass sticky top-[4.75rem] z-30 mt-8 flex flex-col gap-4 rounded-[24px] px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
        {/* category pills — a real radio group so arrow keys work */}
        <div role="radiogroup" aria-label="Kategori" className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const on = c.id === active.id
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() =>
                  navigate(c.id === 'semua' ? '/katalog' : `/katalog?kategori=${c.id}`)
                }
                className="relative min-h-9 rounded-full px-4 text-[0.8125rem] transition-colors duration-200"
              >
                {/* The selected pill is a shared element: it slides between
                    options instead of blinking on and off. layoutId is what
                    makes Motion treat the two as the same object. */}
                {on && (
                  <motion.span
                    layoutId="pill"
                    transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                    className="absolute inset-0 rounded-full bg-ink shadow-[0_2px_10px_rgba(20,20,19,0.18)]"
                  />
                )}
                <span className={`relative ${on ? 'text-paper' : 'text-muted hover:text-ink'}`}>
                  {c.label}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <label htmlFor="cari" className="sr-only">
              Cari barang
            </label>
            <input
              id="cari"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari barang…"
              className="field sm:w-56"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="urut" className="type-label shrink-0">
              Urutkan
            </label>
            <select
              id="urut"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="field sm:w-44"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ---- grid ---- */}
      {results.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="flex flex-col items-center justify-center gap-4 py-28 text-center"
        >
          <p className="type-h3 font-normal">Tidak ada barang yang cocok.</p>
          <p className="max-w-sm text-[0.875rem] type-muted">
            Coba kata kunci lain, atau lihat seluruh koleksi.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('')
              navigate('/katalog')
            }}
            className="btn btn-outline mt-2"
          >
            Tampilkan semua
          </button>
        </motion.div>
      ) : (
        // Keyed on query + sort so the grid re-staggers when the results
        // actually change; keying on category alone would make a search look
        // like nothing happened.
        //
        // Deliberately NOT an <AnimatePresence> with popLayout: that takes
        // exiting children out of flow and positions them absolutely, and a
        // grid is not a positioning context — the cards would animate away
        // from the top-left corner of the page. A remount-and-stagger reads
        // just as well here and cannot misfire.
        <motion.div
          key={`${query}|${sort}|${active.id}`}
          variants={stagger(0.04)}
          initial="hidden"
          animate="show"
          className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4"
        >
          {results.map((p, i) => (
            <motion.div key={p.id} variants={riseIn}>
              {/* The first row is above the fold at every breakpoint we
                  support (4 columns on desktop, 2 on a phone), so those
                  photos load eagerly. The rest lazy-load — 12 eager 1000px
                  JPEGs would fight each other for bandwidth on first paint
                  and delay the ones the shopper is actually looking at. */}
              <ProductCard product={p} priority={i < 4} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
