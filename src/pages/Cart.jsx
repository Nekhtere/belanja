import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useCart } from '../store/CartContext'
import { useCheckout } from '../store/CheckoutContext'
import { findProduct } from '../data/catalog'
import { stockFor } from '../data/stock'
import { formatPrice } from '../lib/format'
import { SHIPPING, addressComplete, promoFor, totalsFor } from '../lib/checkout'
import { navigate } from '../lib/router'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import ProductPhoto from '../components/ProductPhoto'
import OrderSummary from '../components/OrderSummary'
import DemoNotice from '../components/DemoNotice'
import ChoiceCard from '../components/ChoiceCard'
import { EASE, SPRING } from '../lib/motion'

/** Address fields, in the order they are asked for. */
const FIELDS = [
  { key: 'name', label: 'Nama penerima', placeholder: 'Nama lengkap', autoComplete: 'name', required: true },
  { key: 'phone', label: 'Nomor telepon', placeholder: '08xx xxxx xxxx', autoComplete: 'tel', type: 'tel', required: true },
  { key: 'street', label: 'Alamat lengkap', placeholder: 'Jalan, nomor, RT/RW, patokan', autoComplete: 'street-address', required: true, wide: true },
  { key: 'city', label: 'Kota / kabupaten', placeholder: 'Batam', autoComplete: 'address-level2', required: true },
  { key: 'postcode', label: 'Kode pos', placeholder: '29400', autoComplete: 'postal-code', inputMode: 'numeric' },
]

export default function Cart() {
  useDocumentTitle('Keranjang — RUPA')
  const { lines, setQty, removeItem, clear } = useCart()
  const { address, shippingId, promoCode, setAddressField, setShipping, setPromoCode } = useCheckout()

  // Only the TYPED value is local; the APPLIED code lives in the checkout
  // store, because the payment page has to see it too. Keeping the applied
  // code here would make the discount vanish on the next screen.
  const [promoInput, setPromoInput] = useState('')
  const [promoError, setPromoError] = useState('')

  const totals = useMemo(
    () => totalsFor(lines, { shippingId, promoCode }),
    [lines, shippingId, promoCode]
  )

  // Readiness is a function of the address only — deliberately not of stock.
  // See the warning below for why an uncertain stock count must not block a
  // purchase.
  const ready = addressComplete(address)

  const onApplyPromo = (e) => {
    e.preventDefault()
    const found = promoFor(promoInput)
    if (!found) {
      setPromoError('Kode tidak dikenali.')
      return
    }
    setPromoCode(found.code)
    setPromoError('')
    setPromoInput('')
  }

  /* ---- empty ---------------------------------------------------------- */
  if (lines.length === 0) {
    return (
      <div className="wrap pt-10 md:pt-14">
        <p className="type-label">Keranjang</p>
        <h1 className="type-h2 mt-2">Keranjang masih kosong</h1>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mt-6 flex flex-col items-start gap-4"
        >
          <p className="max-w-md text-[0.875rem] type-muted">
            Belum ada barang di sini. Mulai dari katalog — dua belas barang, semuanya kami pilih
            karena bahannya.
          </p>
          <button type="button" onClick={() => navigate('/katalog')} className="btn btn-ink">
            Lihat katalog
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="wrap pt-10 md:pt-14">
      <p className="type-label">Langkah 1 dari 3</p>
      <h1 className="type-h2 mt-2">Keranjang</h1>
      <p className="mt-3 max-w-lg text-[0.875rem] type-muted">
        Periksa barangnya, lalu isi alamat pengiriman. Pembayaran di langkah berikutnya.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-10">
        {/* ================= left: the work ================= */}
        <div className="lg:col-span-7">
          {/* ---- items ---- */}
          <section aria-labelledby="items-head">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="items-head" className="type-h3">
                Barang
              </h2>
              <button
                type="button"
                onClick={clear}
                className="text-[0.75rem] text-faint transition-colors duration-200 hover:text-ink"
              >
                Kosongkan
              </button>
            </div>

            {/* layout on the rows so removing one slides the others up rather
                than snapping the list — same reasoning as the drawer. */}
            <ul className="mt-4 divide-y divide-line border-y border-line">
              <AnimatePresence initial={false}>
                {lines.map((line) => {
                  const product = findProduct(line.id)
                  const stock = stockFor(line.id)
                  return (
                    <motion.li
                      key={line.key}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 40 }}
                      transition={{ duration: 0.35, ease: EASE, layout: SPRING }}
                      className="flex gap-4 py-5"
                    >
                      {/* The thumbnail is looked up from the catalogue by id
                          rather than stored on the line — a stored URL would be
                          a stale absolute path after the next build. */}
                      <a
                        href={`#/produk/${line.id}`}
                        onClick={(e) => {
                          e.preventDefault()
                          navigate(`/produk/${line.id}`)
                        }}
                        className="tile size-24 shrink-0 rounded-[20px]"
                        aria-label={`Buka ${line.name}`}
                      >
                        <ProductPhoto photo={product?.photo} alt="" sizes="96px" />
                      </a>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <a
                            href={`#/produk/${line.id}`}
                            onClick={(e) => {
                              e.preventDefault()
                              navigate(`/produk/${line.id}`)
                            }}
                            className="ul-hover text-[0.9375rem] font-medium leading-snug"
                          >
                            {line.name}
                          </a>
                          <button
                            type="button"
                            onClick={() => removeItem(line.key)}
                            className="shrink-0 text-[0.75rem] text-faint transition-colors duration-200 hover:text-ink"
                            aria-label={`Hapus ${line.name}`}
                          >
                            Hapus
                          </button>
                        </div>

                        {(line.size || line.colorName) && (
                          <p className="mt-0.5 text-[0.75rem] type-muted">
                            {[line.size, line.colorName].filter(Boolean).join(' · ')}
                          </p>
                        )}

                        {/* The stock warning.
                            THIS DOES NOT BLOCK CHECKOUT, and that is the whole
                            point. `sling-bag` is recorded as sold out but was
                            last checked six days ago — refusing the order on
                            that basis would repeat the bug the stock feature
                            exists to prevent. The record is uncertain, so the
                            shopper is told it is uncertain and allowed to
                            proceed; the store confirms afterwards. */}
                        {stock.soldOut && (
                          <p className="mt-1.5 text-[0.75rem] text-sale">
                            Tercatat habis — masih bisa dipesan, kami konfirmasi dulu.
                          </p>
                        )}
                        {!stock.soldOut && stock.stale && (
                          <p className="mt-1.5 text-[0.75rem] text-sale">
                            Catatan stok sudah lama — kami pastikan sebelum kirim.
                          </p>
                        )}

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex items-center rounded-full border border-line bg-paper/70">
                            <button
                              type="button"
                              onClick={() => setQty(line.key, line.qty - 1)}
                              className="grid size-9 place-items-center rounded-full text-[0.9375rem] transition-colors duration-200 hover:bg-tile"
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
                              className="grid size-9 place-items-center rounded-full text-[0.9375rem] transition-colors duration-200 hover:bg-tile"
                              aria-label={`Tambah jumlah ${line.name}`}
                            >
                              +
                            </button>
                          </div>
                          <p className="tnum text-[0.9375rem] font-medium">
                            {formatPrice(line.price * line.qty)}
                          </p>
                        </div>
                      </div>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>

            <button
              type="button"
              onClick={() => navigate('/katalog')}
              className="mt-4 text-[0.8125rem] type-muted transition-colors duration-200 hover:text-ink"
            >
              ← Lanjut belanja
            </button>
          </section>

          {/* ---- delivery ---- */}
          <section aria-labelledby="kirim-head" className="mt-14">
            <h2 id="kirim-head" className="type-h3">
              Alamat pengiriman
            </h2>
            <p className="mt-2 text-[0.75rem] text-faint">
              Kolom bertanda wajib diisi untuk melanjutkan ke pembayaran.
            </p>

            {/* Two columns on a phone would put "Nama" and "Telepon" side by
                side at ~150px each — narrow enough that a long name is clipped
                while being typed. One column until sm. */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key} className={f.wide ? 'sm:col-span-2' : ''}>
                  <label htmlFor={`addr-${f.key}`} className="type-label">
                    {f.label}
                    {f.required && <span className="ml-1 text-sale">*</span>}
                  </label>
                  <input
                    id={`addr-${f.key}`}
                    type={f.type ?? 'text'}
                    inputMode={f.inputMode}
                    autoComplete={f.autoComplete}
                    value={address[f.key]}
                    onChange={(e) => setAddressField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    aria-required={f.required || undefined}
                    className="field mt-2"
                  />
                </div>
              ))}

              <div className="sm:col-span-2">
                <label htmlFor="addr-note" className="type-label">
                  Catatan untuk kurir
                </label>
                <textarea
                  id="addr-note"
                  value={address.note}
                  onChange={(e) => setAddressField('note', e.target.value)}
                  placeholder="Opsional — patokan, jam yang aman, titip ke resepsionis"
                  rows={2}
                  className="field mt-2"
                />
              </div>
            </div>
          </section>

          {/* ---- shipping ---- */}
          <section aria-labelledby="opsi-head" className="mt-14">
            <h2 id="opsi-head" className="type-h3">
              Pengiriman
            </h2>
            <fieldset className="mt-5">
              <legend className="sr-only">Pilih metode pengiriman</legend>
              <div className="grid gap-3">
                {SHIPPING.map((s) => {
                  // Pickup is never waived, so it must not advertise a free
                  // threshold it does not participate in.
                  const waived = s.cost > 0 && totals.freeShipping
                  return (
                    <ChoiceCard
                      key={s.id}
                      name="shipping"
                      value={s.id}
                      checked={s.id === shippingId}
                      onSelect={setShipping}
                      title={s.label}
                      subtitle={`${s.eta} · ${s.carrier}`}
                      right={
                        s.cost === 0 ? (
                          'Gratis'
                        ) : waived ? (
                          <>
                            <span className="mr-2 text-[0.75rem] text-faint line-through">
                              {formatPrice(s.cost)}
                            </span>
                            Gratis
                          </>
                        ) : (
                          formatPrice(s.cost)
                        )
                      }
                    />
                  )
                })}
              </div>
            </fieldset>
          </section>
        </div>

        {/* ================= right: the summary ================= */}
        <div className="lg:col-span-5">
          {/* sticky, so the total stays in view while the address is filled —
              on a long form the number being spent is otherwise off-screen. */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.05 }}
            className="glass rounded-[28px] p-6 md:p-7 lg:sticky lg:top-28"
          >
            <h2 className="type-h3 text-[1.0625rem]">Ringkasan</h2>

            <OrderSummary lines={lines} totals={totals} className="mt-5" />

            {/* ---- promo ---- */}
            <form onSubmit={onApplyPromo} className="mt-6">
              {promoCode ? (
                <>
                  <p className="type-label">Kode promo</p>
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-control border border-line bg-tile/60 px-4 py-2.5">
                    <span className="tnum text-[0.8125rem] font-medium">{promoCode}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPromoCode(null)
                        setPromoError('')
                      }}
                      className="text-[0.75rem] text-faint transition-colors duration-200 hover:text-ink"
                    >
                      Hapus
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* The label lives inside this branch, not above the
                      conditional. An `htmlFor="promo"` left pointing at an
                      input that is no longer rendered is a label attached to
                      nothing — it reads as an orphan to a screen reader and
                      is exactly the kind of markup rot that appears when a
                      field is swapped for a summary row. */}
                  <label htmlFor="promo" className="type-label">
                    Kode promo
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="promo"
                      value={promoInput}
                      onChange={(e) => {
                        setPromoInput(e.target.value)
                        if (promoError) setPromoError('')
                      }}
                      placeholder="RUPA10"
                      autoComplete="off"
                      aria-invalid={promoError ? 'true' : undefined}
                      aria-describedby={promoError ? 'promo-error' : undefined}
                      className="field flex-1 uppercase placeholder:normal-case"
                    />
                    <button type="submit" disabled={!promoInput.trim()} className="btn btn-outline">
                      Pakai
                    </button>
                  </div>
                  {promoError && (
                    <p id="promo-error" className="mt-2 text-[0.75rem] text-sale">
                      {promoError}
                    </p>
                  )}
                </>
              )}
            </form>

            {/* ---- the step's own disclosure ---- */}
            <DemoNotice className="mt-6" />

            {/* ---- continue ---- */}
            <button
              type="button"
              disabled={!ready}
              onClick={() => navigate('/pembayaran')}
              aria-describedby={!ready ? 'belum-lengkap' : undefined}
              className="btn btn-ink btn-block mt-4 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Lanjut ke pembayaran
            </button>

            {/* The button is disabled, so it cannot say why on click. The
                reason is stated next to it instead of being left to a tooltip
                that never appears on touch. */}
            {!ready && (
              <p id="belum-lengkap" className="mt-3 text-center text-[0.75rem] type-muted">
                Isi nama, telepon, alamat, dan kota dulu.
              </p>
            )}

            <p className="mt-4 text-center text-[0.75rem] text-faint">
              {formatPrice(totals.total)} untuk {lines.reduce((n, l) => n + l.qty, 0)} barang
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
