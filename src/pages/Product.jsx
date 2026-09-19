import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import ProductPhoto from '../components/ProductPhoto'
import ProductCard from '../components/ProductCard'
import Reviews from '../components/Reviews'
import AdminChat from '../components/AdminChat'
import Stars from '../components/Stars'
import { PRODUCTS, findProduct } from '../data/catalog'
import { useReviews } from '../store/ReviewsContext'
import { stockFor, stockLabel, stockAge } from '../data/stock'
import { formatPrice, discountPercent, formatRating } from '../lib/format'
import { navigate } from '../lib/router'
import { useCart } from '../store/CartContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { EASE, riseIn, stagger, viewport } from '../lib/motion'

/**
 * Fallback colour names, used only when a product has no `colorNames` array.
 * The real names live per product in data/catalog.js — a shared positional
 * list labelled a white swatch "Abu" and an olive one "Natural".
 */
const FALLBACK_COLOR_NAMES = ['Natural', 'Hitam', 'Abu', 'Navy', 'Zaitun', 'Coklat', 'Krem']

export default function Product({ id }) {
  const product = findProduct(id)
  const { addItem } = useCart()
  const { summaryFor } = useReviews()

  const [size, setSize] = useState(null)
  const [colorIndex, setColorIndex] = useState(0)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  useDocumentTitle(product ? `${product.name} — RUPA` : 'Barang tidak ditemukan — RUPA')

  // Reset the selections when navigating between products. Without this,
  // moving from a sized product to a fragrance would carry a stale size over.
  useEffect(() => {
    setSize(product?.sizes?.[0] ?? null)
    setColorIndex(0)
    setQty(1)
    setAdded(false)
    setChatOpen(false)
  }, [id, product])

  // Let the confirmation retire on its own rather than sitting there until
  // the next interaction.
  useEffect(() => {
    if (!added) return
    const t = setTimeout(() => setAdded(false), 4000)
    return () => clearTimeout(t)
  }, [added])

  const related = useMemo(
    () =>
      product
        ? PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4)
        : [],
    [product]
  )

  if (!product) {
    return (
      <div className="wrap flex flex-col items-center justify-center gap-4 py-32 text-center">
        <h1 className="type-h2">Barang tidak ditemukan</h1>
        <p className="max-w-sm text-[0.875rem] type-muted">
          Barang yang Anda cari mungkin sudah tidak dijual.
        </p>
        <button type="button" onClick={() => navigate('/katalog')} className="btn btn-ink mt-2">
          Kembali ke katalog
        </button>
      </div>
    )
  }

  const onSale = Boolean(product.originalPrice)
  const off = discountPercent(product.price, product.originalPrice)
  const colorHex = product.colors[colorIndex]
  // Prefer the product's own names; the fallback keeps a half-migrated entry
  // readable instead of printing "undefined" in the fieldset legend.
  const colorName =
    product.colorNames?.[colorIndex] ?? FALLBACK_COLOR_NAMES[colorIndex % FALLBACK_COLOR_NAMES.length]
  const colorNameFor = (i) =>
    product.colorNames?.[i] ?? FALLBACK_COLOR_NAMES[i % FALLBACK_COLOR_NAMES.length]

  const stock = stockFor(product.id)
  const stockInfo = stockLabel(stock)
  // Read through the store, not the static data, so a review written further
  // down this page moves this number — the two must not disagree.
  const rating = summaryFor(product.id)

  const onAdd = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      size,
      color: colorHex,
      colorName,
      qty,
    })
    setAdded(true)
  }

  return (
    <div className="wrap pt-6 md:pt-10">
      {/* ---- breadcrumb ---- */}
      <nav aria-label="Breadcrumb" className="text-[0.75rem] type-muted">
        <ol className="flex items-center gap-2">
          <li>
            <a
              href="#/"
              onClick={(e) => {
                e.preventDefault()
                navigate('/')
              }}
              // Padding + min-h so the breadcrumb clears 24px as a tap target —
              // at 15px tall a crumb link was a miss-prone target on a phone.
              // The negative margin keeps the text aligned with the crumbs.
              className="ul-hover -mx-1 inline-block min-h-6 px-1 py-1 align-baseline"
            >
              Beranda
            </a>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <a
              href={`#/katalog?kategori=${product.category}`}
              onClick={(e) => {
                e.preventDefault()
                navigate(`/katalog?kategori=${product.category}`)
              }}
              className="ul-hover -mx-1 inline-block min-h-6 px-1 py-1 align-baseline capitalize"
            >
              {product.category}
            </a>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-ink">{product.name}</li>
        </ol>
      </nav>

      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:gap-10">
        {/* ---- gallery ---- */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="lg:col-span-7"
        >
          <div className="tile aspect-[4/5]">
            <ProductPhoto
              photo={product.photo}
              alt={product.name}
              priority
              sizes="(min-width: 1024px) 55vw, 92vw"
            />
            {onSale && (
              <span className="badge badge-sale absolute left-4 top-4">−{off}%</span>
            )}
          </div>
          <p className="mt-3 text-[0.75rem] text-faint">
            Foto produk. Warna sebenarnya dapat sedikit berbeda tergantung layar.
          </p>
        </motion.div>

        {/* ---- buy panel ---- */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.08 }}
          className="lg:col-span-5"
        >
          <div className="glass rounded-[28px] p-6 md:p-8">
            {product.tag && <p className="type-label">{product.tag}</p>}
            <h1 className="type-h2 mt-2">{product.name}</h1>

            {/* Rating sits directly under the name, before the price — it is
                part of "what is this", not part of "what does it cost". */}
            {rating.count > 0 && (
              <a
                href="#ulasan"
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById('ulasan')?.scrollIntoView({ block: 'start' })
                }}
                // py-1.5 rather than mt-2 alone: the link's own box has to
                // clear 24px or it is an awkward tap target on a phone, and a
                // 21px-high inline link is exactly the kind that gets missed.
                className="mt-1 inline-flex min-h-6 items-center gap-2 py-1.5 text-[0.8125rem] type-muted transition-colors duration-200 hover:text-ink"
              >
                <Stars value={rating.average} size={14} />
                <span className="tnum font-medium text-ink">{formatRating(rating.average)}</span>
                <span className="ul-hover">{rating.count} ulasan</span>
              </a>
            )}

            {/* Stock, stated with its age. The badge alone would be a claim;
                the age is what makes it honest, and it is also the reason the
                chat button below is offered rather than hidden. */}
            <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem]">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-medium uppercase tracking-[0.1em] ${
                  stockInfo.tone === 'out'
                    ? 'bg-sale text-paper'
                    : stockInfo.tone === 'low'
                      ? 'border border-sale text-sale'
                      : 'border border-line-strong text-muted'
                }`}
              >
                {stockInfo.label}
              </span>
              <span className="text-faint">{stockAge(stock)}</span>
            </div>
            {stock.stale && (
              <p className="mt-1.5 text-[0.75rem] text-sale">
                Catatan stok ini sudah lama — tanyakan lewat chat untuk memastikan.
              </p>
            )}

            <div className="mt-4 flex items-baseline gap-3">
              <span className="tnum type-h3">{formatPrice(product.price)}</span>
              {onSale && (
                <>
                  <span className="tnum text-[0.875rem] text-faint line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                  <span className="badge badge-sale">Hemat {off}%</span>
                </>
              )}
            </div>

            <p className="type-muted mt-5 text-[0.875rem] leading-relaxed">{product.blurb}</p>

            {/* --- colour --- */}
            <fieldset className="mt-8">
              <legend className="type-label">
                Warna: <span className="text-ink">{colorName}</span>
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.colors.map((hex, i) => {
                  const on = i === colorIndex
                  return (
                    <button
                      key={hex + i}
                      type="button"
                      onClick={() => setColorIndex(i)}
                      aria-label={colorNameFor(i)}
                      aria-pressed={on}
                      className={`grid size-10 place-items-center rounded-full border transition-all duration-200 ${
                        on
                          ? 'border-ink shadow-[0_0_0_3px_rgba(20,20,19,0.08)]'
                          : 'border-line-strong hover:border-muted'
                      }`}
                    >
                      <span
                        className="size-6 rounded-full border border-line"
                        style={{ background: hex }}
                      />
                    </button>
                  )
                })}
              </div>
            </fieldset>

            {/* --- size --- */}
            {product.sizes && (
              <fieldset className="mt-7">
                <legend className="type-label">Ukuran</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.sizes.map((s) => {
                    const on = s === size
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSize(s)}
                        aria-pressed={on}
                        className={`min-h-11 min-w-14 rounded-full border px-4 text-[0.8125rem] transition-colors duration-200 ${
                          on
                            ? 'border-ink bg-ink text-paper'
                            : 'border-line-strong bg-paper/60 hover:border-ink'
                        }`}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            )}

            {/* --- quantity + add --- */}
            <div className="mt-8 flex flex-wrap items-stretch gap-3">
              <div className="flex items-center rounded-full border border-line-strong bg-paper/60">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="grid size-11 place-items-center rounded-full text-[1rem] transition-colors duration-200 hover:bg-tile"
                  aria-label="Kurangi jumlah"
                >
                  −
                </button>
                <span className="tnum w-10 text-center text-[0.875rem]" aria-live="polite">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(99, q + 1))}
                  className="grid size-11 place-items-center rounded-full text-[1rem] transition-colors duration-200 hover:bg-tile"
                  aria-label="Tambah jumlah"
                >
                  +
                </button>
              </div>

              <button type="button" onClick={onAdd} className="btn btn-ink flex-1">
                Tambah ke keranjang
              </button>
            </div>

            {/* The chat launcher. Sits with the buy controls rather than
                floating in a corner, because the question it answers — "is
                this actually available?" — is a buying question. */}
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="btn btn-outline mt-3 w-full"
            >
              <span aria-hidden="true">💬</span>
              Tanya admin
              {stock.stale && <span className="badge badge-sale">Cek stok</span>}
            </button>

            {/* Announce success to screen readers, and give sighted users a
                way onward rather than a dead end. The region stays mounted so
                aria-live has something to update. */}
            <div aria-live="polite" className="min-h-6">
              <AnimatePresence>
                {added && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="mt-3 flex items-center gap-3 text-[0.8125rem]"
                  >
                    <span aria-hidden="true" className="text-sale">
                      ✓
                    </span>
                    <span>Ditambahkan ke keranjang.</span>
                    <button
                      type="button"
                      onClick={() => navigate('/katalog')}
                      className="ul-hover font-medium"
                    >
                      Lanjut belanja
                    </button>
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* --- meta --- */}
            <dl className="mt-8 divide-y divide-line border-y border-line text-[0.8125rem]">
              <div className="flex justify-between gap-4 py-3">
                <dt className="type-muted">Bahan</dt>
                <dd>{product.material}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="type-muted">Kategori</dt>
                <dd className="capitalize">{product.category}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="type-muted">Pengiriman</dt>
                <dd>1–2 hari kerja</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="type-muted">Penukaran</dt>
                <dd>30 hari</dd>
              </div>
            </dl>

            {/* --- fragrance notes --- */}
            {product.notes && (
              <div className="mt-8 border-t border-line pt-6">
                <p className="type-label">Piramida aroma</p>
                <dl className="mt-4 space-y-3 text-[0.8125rem]">
                  {Object.entries(product.notes).map(([layer, value]) => (
                    <div key={layer} className="flex gap-4">
                      <dt className="w-16 shrink-0 capitalize type-muted">{layer}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* --- details --- */}
            <div className="mt-8 border-t border-line pt-6">
              <p className="type-label">Detail</p>
              <ul className="mt-4 space-y-2.5 text-[0.8125rem] type-muted">
                {product.details.map((d) => (
                  <li key={d} className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-faint" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ---- reviews ---- */}
      <Reviews product={product} />

      {/* ---- related ---- */}
      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="type-h3">Serupa dari kategori ini</h2>
          <motion.div
            variants={stagger(0.05)}
            initial="hidden"
            whileInView="show"
            viewport={viewport}
            className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6"
          >
            {related.map((p) => (
              <motion.div key={p.id} variants={riseIn}>
                <ProductCard product={p} />
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      <AdminChat
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        product={product}
        stock={stock}
      />
    </div>
  )
}
