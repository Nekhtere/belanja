/**
 * Reviews block for the product page.
 *
 * Three parts, in the order a shopper actually uses them: the score, the
 * distribution, then the words. The distribution sits between the two because
 * it is what turns a number into a judgement — "4,3" means something very
 * different when it is 4,3 from five reviews than when it is 4,3 from two
 * hundred, and the bars say which at a glance.
 *
 * The "write a review" form is local-only and says so. It appends to component
 * state, so a submitted review survives until the page is left and no longer —
 * which is the honest behaviour for a demo with no backend, and better than a
 * form that silently discards the input and pretends to have saved it.
 *
 * Heading levels matter here. The product page has an <h1> (the product name)
 * and previously jumped straight to <h3> for the related-products row; this
 * section's <h2> fills that gap rather than adding another one.
 */

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Stars from './Stars'
import { REVIEWS_VISIBLE } from '../data/reviews'
import { useReviews } from '../store/ReviewsContext'
import { formatRating } from '../lib/format'
import { EASE } from '../lib/motion'

/** A single review: who, how many stars, which variant, and the words. */
function ReviewItem({ review }) {
  return (
    <li className="border-t border-line py-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars value={review.rating} size={13} label={`${review.rating} dari 5 bintang`} />
        <p className="text-[0.875rem] font-medium">{review.name}</p>
        {/* The variant is the cheapest credibility signal on the page — it
            proves the review is about a specific purchase. */}
        {review.variant && (
          <span className="text-[0.75rem] text-faint">{review.variant}</span>
        )}
        <span className="ml-auto text-[0.75rem] text-faint">{review.date}</span>
      </div>
      <p className="mt-2 text-[0.875rem] type-muted">{review.text}</p>
    </li>
  )
}

/** The 5→1 star histogram. The bars are decorative; the numbers carry it. */
function Distribution({ breakdown, count }) {
  const max = Math.max(1, ...breakdown)
  return (
    <ul className="mt-4 space-y-1.5">
      {breakdown.map((n, i) => {
        const starValue = 5 - i
        const pct = (n / max) * 100
        return (
          <li key={starValue} className="flex items-center gap-3 text-[0.75rem]">
            <span className="tnum w-3 shrink-0 text-right type-muted">{starValue}</span>
            <span aria-hidden="true" className="text-faint">
              ★
            </span>
            {/* Track + fill. The fill is scaled, not widened: `width` would
                animate on the main thread, `transform` does not. */}
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <motion.span
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: pct / 100 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: EASE, delay: i * 0.05 }}
                className="block h-full origin-left rounded-full bg-ink"
              />
            </span>
            <span className="tnum w-8 shrink-0 text-faint">
              {count ? `${Math.round((n / count) * 100)}%` : '—'}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** Star picker for the form. Buttons, so it is operable by keyboard. */
function StarPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Pilih jumlah bintang">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-pressed={n <= value}
          aria-label={`${n} bintang`}
          className="grid size-9 place-items-center rounded-full transition-colors duration-200 hover:bg-tile"
        >
          <span className={`text-[1.125rem] leading-none ${n <= value ? 'text-ink' : 'text-line-strong'}`}>
            ★
          </span>
        </button>
      ))}
    </div>
  )
}

export default function Reviews({ product }) {
  const { allFor, summaryFor, addReview } = useReviews()
  const [showAll, setShowAll] = useState(false)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ name: '', rating: 0, text: '' })

  // Both the list and the score come from the same array, so a review written
  // here moves the average in the buy panel above — see ReviewsContext for the
  // bug that made this necessary.
  const all = allFor(product.id)
  const summary = summaryFor(product.id)
  const shown = showAll ? all : all.slice(0, REVIEWS_VISIBLE)
  const hidden = all.length - shown.length

  const submit = (e) => {
    e.preventDefault()
    if (!draft.rating || !draft.text.trim()) return
    addReview(product.id, {
      name: draft.name.trim() || 'Anda',
      rating: draft.rating,
      variant: null,
      date: 'Baru saja',
      text: draft.text.trim(),
    })
    setDraft({ name: '', rating: 0, text: '' })
    setOpen(false)
    setShowAll(true)
  }

  return (
    <section className="mt-24" aria-labelledby="ulasan">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="ulasan" className="type-h3">
          Ulasan pembeli
        </h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="ul-hover py-1.5 text-[0.8125rem] transition-colors duration-200 hover:text-ink"
        >
          {open ? 'Batal' : 'Tulis ulasan'} →
        </button>
      </div>

      {summary.count === 0 ? (
        <p className="mt-4 text-[0.875rem] type-muted">
          Belum ada ulasan untuk barang ini. Jadilah yang pertama menulis.
        </p>
      ) : (
        <div className="mt-6 grid gap-8 sm:grid-cols-12">
          {/* --- the score --- */}
          <div className="sm:col-span-4">
            <p className="tnum type-h2">{formatRating(summary.average)}</p>
            <Stars value={summary.average} size={16} className="mt-2" />
            <p className="mt-2 text-[0.8125rem] type-muted">
              Dari {summary.count} ulasan
            </p>
          </div>
          {/* --- the shape of it --- */}
          <div className="sm:col-span-8">
            <Distribution breakdown={summary.breakdown} count={summary.count} />
          </div>
        </div>
      )}

      {/* --- the form --- */}
      <AnimatePresence>
        {open && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE }}
            onSubmit={submit}
            className="mt-6 rounded-card border border-line bg-paper/70 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="type-label">Nilai barang ini</p>
              <StarPicker
                value={draft.rating}
                onChange={(rating) => setDraft((d) => ({ ...d, rating }))}
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Nama (opsional)"
                aria-label="Nama Anda"
                className="field"
              />
              <textarea
                value={draft.text}
                onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
                placeholder="Bagaimana barangnya setelah dipakai?"
                aria-label="Isi ulasan"
                rows={3}
                required
                className="field sm:col-span-2"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!draft.rating || !draft.text.trim()}
                className="btn btn-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                Kirim ulasan
              </button>
              <p className="text-[0.75rem] text-faint">
                Ulasan ini hanya tersimpan di halaman ini — demo tanpa server.
              </p>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* --- the words --- */}
      {shown.length > 0 && (
        <>
          <ul className="mt-8">
            {shown.map((r, i) => (
              <ReviewItem key={`${r.name}-${i}`} review={r} />
            ))}
          </ul>
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="btn btn-outline mt-6"
            >
              Lihat {hidden} ulasan lain
            </button>
          )}
        </>
      )}
    </section>
  )
}
