import { motion } from 'motion/react'
import ProductCard from '../components/ProductCard'
import ProductPhoto from '../components/ProductPhoto'
import { PRODUCTS, CATEGORIES, findProduct } from '../data/catalog'
import { formatPrice } from '../lib/format'
import { navigate } from '../lib/router'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { riseIn, stagger, viewport, EASE } from '../lib/motion'

/** The product the hero panel promotes. Falls back to the first item so a
 *  renamed id degrades to a wrong-but-working hero instead of a blank one. */
const HERO = findProduct('jaket-twill') ?? PRODUCTS[0]

/** Category tiles with their cheapest item — "mulai dari" sets expectations. */
function CategoryStrip() {
  const cards = CATEGORIES.filter((c) => c.id !== 'semua').map((c) => {
    const items = PRODUCTS.filter((p) => p.category === c.id)
    // An empty category has no photo to show and no floor price — rendering it
    // would crash on `items[0].photo`, so it is skipped instead.
    if (items.length === 0) return null
    return {
      ...c,
      count: items.length,
      from: Math.min(...items.map((p) => p.price)),
      // The category is represented by its first product's photo. A real
      // photo beats a generic one here — it is the shopper's first look at
      // what is actually inside the category.
      photo: items[0].photo,
    }
  }).filter(Boolean)

  return (
    <motion.div
      variants={stagger(0.07)}
      initial="hidden"
      whileInView="show"
      viewport={viewport}
      className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-6"
    >
      {cards.map((c) => (
        <motion.a
          key={c.id}
          variants={riseIn}
          href={`#/katalog?kategori=${c.id}`}
          onClick={(e) => {
            e.preventDefault()
            navigate(`/katalog?kategori=${c.id}`)
          }}
          className="group"
        >
          <div className="tile aspect-square">
            <ProductPhoto
              photo={c.photo}
              alt=""
              sizes="(min-width: 768px) 23vw, 46vw"
              className="tile-art"
            />
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <h3 className="text-[0.9375rem] font-medium">{c.label}</h3>
            <span className="tnum text-[0.75rem] text-faint">{c.count} barang</span>
          </div>
          <p className="tnum mt-0.5 text-[0.8125rem] type-muted">
            Mulai {formatPrice(c.from)}
          </p>
        </motion.a>
      ))}
    </motion.div>
  )
}

function SectionHead({ label, title, action, onAction }) {
  return (
    <motion.div
      variants={stagger(0.08)}
      initial="hidden"
      whileInView="show"
      viewport={viewport}
      className="flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        <motion.p variants={riseIn} className="type-label">
          {label}
        </motion.p>
        <motion.h2 variants={riseIn} className="type-h2 mt-2">
          {title}
        </motion.h2>
      </div>
      {action && (
        <motion.button
          variants={riseIn}
          type="button"
          onClick={onAction}
          className="ul-hover py-1.5 text-[0.8125rem] transition-colors duration-200 hover:text-ink"
        >
          {action} →
        </motion.button>
      )}
    </motion.div>
  )
}

/** A grid of product cards that reveals as a group, once. */
function ProductGrid({ items }) {
  return (
    <motion.div
      variants={stagger(0.05)}
      initial="hidden"
      whileInView="show"
      viewport={viewport}
      className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6"
    >
      {items.map((p) => (
        <motion.div key={p.id} variants={riseIn}>
          <ProductCard product={p} />
        </motion.div>
      ))}
    </motion.div>
  )
}

export default function Home() {
  useDocumentTitle('RUPA — Pakaian, Tas & Parfum Pilihan')

  // Two feature rows, each padded to a full row of four. Only five products
  // carry a tag, so without the padding a 4-column grid would leave visible
  // holes. Padding with the remaining catalogue keeps both rows square.
  const byTag = (tag) => PRODUCTS.filter((p) => p.tag === tag)
  const fill = (primary, exclude) => {
    const rest = PRODUCTS.filter((p) => !primary.includes(p) && !exclude.includes(p))
    return [...primary, ...rest].slice(0, 4)
  }

  const featuredPrimary = byTag('Terlaris')
  const featured = fill(featuredPrimary, [])
  const newest = fill(byTag('Baru'), featuredPrimary)

  return (
    <>
      {/* ---- hero ----
          The hero is the one place the page is allowed to perform: the copy
          staggers in on load, and the art panel is a slab of glass with the
          product sitting behind it. */}
      <section className="wrap pt-14 md:pt-20">
        <div className="grid items-end gap-10 md:grid-cols-12">
          <motion.div
            variants={stagger(0.09, 0.05)}
            initial="hidden"
            animate="show"
            className="md:col-span-7"
          >
            <motion.p variants={riseIn} className="type-label">
              Koleksi 2026
            </motion.p>
            {/* aria-label because the <br> would otherwise make the accessible
                name run the two lines together as "sedikit,dipilih". */}
            <motion.h1
              variants={riseIn}
              className="type-hero mt-4"
              aria-label="Barang sedikit, dipilih dengan alasan."
            >
              Barang sedikit,
              <br />
              dipilih dengan alasan.
            </motion.h1>
            <motion.p variants={riseIn} className="type-muted mt-6 max-w-md text-[0.9375rem]">
              Kami tidak menjual seribu pilihan. Setiap barang di sini dipilih karena bahannya
              bagus, potongannya rapi, dan akan tetap dipakai lima tahun lagi.
            </motion.p>
            <motion.div variants={riseIn} className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={() => navigate('/katalog')} className="btn btn-ink">
                Lihat semua barang
              </button>
              <button
                type="button"
                onClick={() => navigate('/katalog?kategori=parfum')}
                className="btn btn-outline"
              >
                Mulai dari parfum
              </button>
            </motion.div>
          </motion.div>

          {/* Editorial side panel. The glass caption bar floats over the art
              and blurs it — the clearest single demonstration of the effect. */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
            className="md:col-span-5"
          >
            <div className="tile aspect-[4/5]">
              {/* Pulled from the catalogue rather than hardcoded, so the
                  photo and the name under it cannot drift apart — the old
                  SVG was pinned to `art="jacket"` and the caption to a
                  literal string, which is two things to keep in sync by
                  hand and one thing to forget. */}
              <ProductPhoto
                photo={HERO.photo}
                alt=""
                priority
                sizes="(min-width: 768px) 38vw, 92vw"
              />
              <div className="glass glass-sheen absolute inset-x-3 bottom-3 flex items-end justify-between gap-3 rounded-[20px] p-3">
                <div>
                  <p className="type-label">Sorotan</p>
                  <p className="mt-1 text-[0.9375rem] font-medium">{HERO.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/produk/${HERO.id}`)}
                  className="btn btn-ink shrink-0"
                >
                  Lihat
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---- trust strip ---- */}
      <section className="wrap mt-20">
        <motion.ul
          variants={stagger(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
          className="grid gap-6 sm:grid-cols-3"
        >
          {[
            ['Kirim 1–2 hari', 'Dikirim dari Jakarta setiap hari kerja'],
            ['Tukar 30 hari', 'Belum cocok? Kembalikan, kami ganti'],
            ['Bahan transparan', 'Gramasi dan komposisi selalu dicantumkan'],
          ].map(([title, body]) => (
            <motion.li
              key={title}
              variants={riseIn}
              className="glass rounded-[20px] px-5 py-5"
            >
              <p className="text-[0.875rem] font-medium">{title}</p>
              <p className="mt-1 text-[0.8125rem] type-muted">{body}</p>
            </motion.li>
          ))}
        </motion.ul>
      </section>

      {/* ---- categories ---- */}
      <section className="wrap mt-20">
        <SectionHead label="Kategori" title="Mulai dari sini" />
        <div className="mt-10">
          <CategoryStrip />
        </div>
      </section>

      {/* ---- featured ---- */}
      <section className="wrap mt-20">
        <SectionHead
          label="Paling dicari"
          title="Terlaris bulan ini"
          action="Lihat katalog"
          onAction={() => navigate('/katalog')}
        />
        <ProductGrid items={featured} />
      </section>

      {/* ---- editorial note ---- */}
      <section className="wrap mt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ duration: 0.8, ease: EASE }}
          className="glass rounded-[28px] px-6 py-10 md:px-12 md:py-14"
        >
          <div className="grid gap-8 md:grid-cols-12">
            <p className="type-label md:col-span-3">Kenapa sedikit</p>
            <p className="type-h3 max-w-2xl font-normal leading-relaxed text-ink md:col-span-9 md:text-[1.375rem]">
              Menjual banyak jenis barang itu mudah. Yang sulit adalah memastikan setiap barang
              layak dibeli. Karena itu kami membatasi koleksi — supaya kami bisa menguji sendiri
              setiap bahan, dan Anda tidak perlu menebak kualitas dari foto.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ---- new arrivals ---- */}
      <section className="wrap mt-20">
        <SectionHead
          label="Baru masuk"
          title="Baru minggu ini"
          action="Lihat katalog"
          onAction={() => navigate('/katalog')}
        />
        <ProductGrid items={newest} />
      </section>
    </>
  )
}
