import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useCart } from '../store/CartContext'
import { useCheckout } from '../store/CheckoutContext'
import { formatPrice } from '../lib/format'
import { DEMO_VA, METHODS, addressComplete, methodFor, totalsFor } from '../lib/checkout'
import { navigate } from '../lib/router'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import OrderSummary from '../components/OrderSummary'
import DemoNotice from '../components/DemoNotice'
import ChoiceCard from '../components/ChoiceCard'
import { EASE } from '../lib/motion'

/**
 * The payment step.
 *
 * THREE STAGES, ONE ROUTE
 *
 * `method` -> `instructions` -> `done` is local state, not three routes. A
 * route per stage would let someone deep-link straight to "done" and be shown
 * a confirmation for an order that was never placed — the URL would be
 * asserting something the app has no record of. Keeping it in state means the
 * confirmation is only reachable by actually going through the flow.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *
 * There is no card form and no QR code. A card form in a demo asks a stranger
 * to type a real card number into something that will never process it; a QR
 * that scans to a real page is a liability and one that scans to nothing is
 * theatre. The three methods offered — bank transfer, e-wallet, cash on
 * delivery — all work without a single credential, which is the only kind of
 * payment this demo can honestly show. See lib/checkout.js for the full note.
 */
export default function Payment() {
  useDocumentTitle('Pembayaran — RUPA')
  const { lines, clear } = useCart()
  const {
    address,
    shippingId,
    promoCode,
    methodId,
    setMethodId,
    order,
    placeOrder,
    clearOrder,
  } = useCheckout()

  // Start on the confirmation if an order is already in memory (the shopper
  // came back from somewhere inside the flow), otherwise on the method step.
  const [step, setStep] = useState(order ? 'done' : 'method')

  const totals = useMemo(
    () => totalsFor(lines, { shippingId, promoCode }),
    [lines, shippingId, promoCode]
  )

  /* ---- guards --------------------------------------------------------- */

  // Nothing to pay for. Reachable by reloading after an order was completed,
  // since the order itself is intentionally not persisted.
  if (lines.length === 0 && !order) {
    return (
      <div className="wrap pt-10 md:pt-14">
        <p className="type-label">Pembayaran</p>
        <h1 className="type-h2 mt-2">Tidak ada yang perlu dibayar</h1>
        <p className="mt-4 max-w-md text-[0.875rem] type-muted">
          Keranjang kosong. Kalau Anda baru saja menyelesaikan pesanan, pesanannya tidak disimpan
          — demo ini tidak punya server, jadi konfirmasinya hilang saat halaman dimuat ulang.
        </p>
        <button type="button" onClick={() => navigate('/katalog')} className="btn btn-ink mt-6">
          Lihat katalog
        </button>
      </div>
    )
  }

  // The payment step is reachable by typing the hash, so it cannot assume the
  // address was filled. `addressComplete` is the same function the cart page
  // used to enable its button — one rule, so this screen can never accept an
  // order the cart page would have refused.
  if (!order && !addressComplete(address)) {
    return (
      <div className="wrap pt-10 md:pt-14">
        <p className="type-label">Pembayaran</p>
        <h1 className="type-h2 mt-2">Alamat belum lengkap</h1>
        <p className="mt-4 max-w-md text-[0.875rem] type-muted">
          Isi nama penerima, telepon, alamat, dan kota dulu sebelum memilih pembayaran.
        </p>
        <button type="button" onClick={() => navigate('/keranjang')} className="btn btn-ink mt-6">
          Kembali ke keranjang
        </button>
      </div>
    )
  }

  /**
   * Everything below reads from the ORDER once one exists.
   *
   * This is the point of `placeOrder` taking a snapshot: pressing "Buat
   * pesanan" clears the cart, and if the confirmation read the live cart it
   * would render an empty receipt at the exact moment the shopper is checking
   * what they bought. The order is the single source from here on.
   */
  const viewLines = order?.lines ?? lines
  const viewTotals = order?.totals ?? totals
  // methodFor falls back instead of returning undefined, which a bare
  // METHODS.find would do if the stored id no longer exists.
  const method = order?.method ?? methodFor(methodId)

  /** Take the order, then branch on how it gets paid. */
  const onCreateOrder = () => {
    const placed = placeOrder({ lines, totals, methodId })
    // Cash on delivery has nothing to instruct — the courier collects. Bank
    // transfer and e-wallet need a screen explaining where the money goes.
    if (placed.method.id === 'cod') {
      clear()
      setStep('done')
      return
    }
    setStep('instructions')
  }

  /** The shopper says they have paid. We cannot verify it — and say so. */
  const onPaid = () => {
    clear()
    setStep('done')
  }

  const leave = (to) => {
    clearOrder()
    navigate(to)
  }

  return (
    <div className="wrap pt-10 md:pt-14">
      <p className="type-label">
        {step === 'done'
          ? 'Selesai'
          : step === 'instructions'
            ? 'Langkah 3 dari 3'
            : 'Langkah 2 dari 3'}
      </p>
      <h1 className="type-h2 mt-2">
        {step === 'done' ? 'Pesanan diterima' : step === 'instructions' ? 'Selesaikan pembayaran' : 'Pembayaran'}
      </h1>

      <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7">
          {/* ================= the flow ================= */}
          <AnimatePresence mode="wait" initial={false}>
            {/* ---- 1. choose a method ---- */}
            {step === 'method' && (
              <motion.section
                key="method"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE }}
                aria-labelledby="metode-head"
              >
                <button
                  type="button"
                  onClick={() => navigate('/keranjang')}
                  className="text-[0.8125rem] type-muted transition-colors duration-200 hover:text-ink"
                >
                  ← Kembali ke keranjang
                </button>

                <h2 id="metode-head" className="type-h3 mt-6">
                  Metode pembayaran
                </h2>

                <fieldset className="mt-5">
                  <legend className="sr-only">Pilih metode pembayaran</legend>
                  <div className="grid gap-3">
                    {METHODS.map((m) => (
                      <ChoiceCard
                        key={m.id}
                        name="method"
                        value={m.id}
                        checked={m.id === methodId}
                        onSelect={setMethodId}
                        title={m.label}
                        subtitle={m.hint}
                      />
                    ))}
                  </div>
                </fieldset>

                {/* The delivery details, read back. A shopper who typed the
                    wrong postcode should be able to catch it here rather than
                    discover it when the courier calls. */}
                <div className="mt-8 rounded-card border border-line bg-paper/60 p-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="type-label">Kirim ke</h3>
                    <button
                      type="button"
                      onClick={() => navigate('/keranjang')}
                      className="text-[0.75rem] text-faint transition-colors duration-200 hover:text-ink"
                    >
                      Ubah
                    </button>
                  </div>
                  <p className="mt-3 text-[0.875rem] font-medium">{address.name}</p>
                  <p className="mt-0.5 text-[0.8125rem] type-muted">
                    {address.phone}
                    <br />
                    {address.street}
                    <br />
                    {address.city}
                    {address.postcode && ` ${address.postcode}`}
                  </p>
                  {address.note && (
                    <p className="mt-2 text-[0.75rem] text-faint">Catatan: {address.note}</p>
                  )}
                </div>

                <DemoNotice tone="warn" className="mt-6">
                  <span className="font-medium">Tidak ada pembayaran sungguhan di sini.</span> Demo
                  tanpa server — pesanan tidak dikirim ke mana pun dan tidak ada uang yang
                  berpindah.
                </DemoNotice>

                <button type="button" onClick={onCreateOrder} className="btn btn-ink btn-block mt-4">
                  Buat pesanan · {formatPrice(viewTotals.total)}
                </button>
              </motion.section>
            )}

            {/* ---- 2. how to pay ---- */}
            {step === 'instructions' && (
              <motion.section
                key="instructions"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE }}
                aria-labelledby="bayar-head"
              >
                <h2 id="bayar-head" className="type-h3">
                  {method.id === 'ewallet' ? 'Buka aplikasi e-wallet' : 'Transfer ke nomor ini'}
                </h2>

                {method.id === 'va' ? (
                  <>
                    <p className="mt-3 text-[0.875rem] type-muted">
                      Buka m-banking, pilih Transfer ke Virtual Account, lalu masukkan nomor di
                      bawah. Nominalnya harus tepat.
                    </p>

                    <div className="mt-6 rounded-[20px] border border-line bg-paper p-5">
                      <p className="type-label">Virtual Account</p>
                      <p className="tnum mt-2 text-[1.375rem] font-medium tracking-[0.04em]">
                        {DEMO_VA}
                      </p>
                      <p className="mt-1 text-[0.75rem] text-sale">
                        Nomor contoh — jangan ditransfer.
                      </p>

                      <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-line pt-4">
                        <span className="type-muted text-[0.8125rem]">Jumlah</span>
                        <span className="tnum type-h3 text-[1.125rem]">
                          {formatPrice(viewTotals.total)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-[0.875rem] type-muted">
                      Buka GoPay, OVO, atau DANA, pilih Bayar, lalu masukkan nomor pesanan di bawah
                      ini.
                    </p>

                    <div className="mt-6 rounded-[20px] border border-line bg-paper p-5">
                      <p className="type-label">Nomor pesanan</p>
                      <p className="tnum mt-2 text-[1.375rem] font-medium tracking-[0.04em]">
                        {order?.number}
                      </p>
                      <p className="mt-1 text-[0.75rem] text-sale">
                        Nomor contoh — tidak terdaftar di aplikasi mana pun.
                      </p>

                      <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-line pt-4">
                        <span className="type-muted text-[0.8125rem]">Jumlah</span>
                        <span className="tnum type-h3 text-[1.125rem]">
                          {formatPrice(viewTotals.total)}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* The honest bit. Nothing here can verify a payment, and a
                    button that claimed to would be the worst lie in the flow. */}
                <DemoNotice tone="warn" className="mt-6">
                  <span className="font-medium">Kami tidak bisa memeriksa pembayaran.</span> Tekan
                  tombol di bawah kalau sudah transfer — demo ini hanya melanjutkan tampilan, bukan
                  memverifikasi apa pun.
                </DemoNotice>

                <button type="button" onClick={onPaid} className="btn btn-ink btn-block mt-4">
                  Saya sudah bayar
                </button>
                <button
                  type="button"
                  onClick={() => leave('/katalog')}
                  className="mt-2 w-full py-2 text-[0.8125rem] type-muted transition-colors duration-200 hover:text-ink"
                >
                  Bayar nanti
                </button>
              </motion.section>
            )}

            {/* ---- 3. done ---- */}
            {step === 'done' && (
              <motion.section
                key="done"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE }}
                aria-labelledby="selesai-head"
              >
                <div className="glass rounded-[28px] p-6 md:p-8">
                  <span
                    aria-hidden="true"
                    className="grid size-12 place-items-center rounded-full bg-ink text-[1.25rem] text-paper"
                  >
                    ✓
                  </span>

                  <h2 id="selesai-head" className="type-h3 mt-5">
                    Terima kasih{order?.address?.name ? `, ${order.address.name}` : ''}
                  </h2>

                  <p className="mt-2 text-[0.875rem] type-muted">
                    {order?.method.id === 'cod'
                      ? 'Kurir akan menagih saat barang tiba. Kami hubungi dulu untuk memastikan stok dan jadwal.'
                      : 'Kami akan mengabari setelah pembayaran dan stok dipastikan.'}
                  </p>

                  <dl className="mt-6 divide-y divide-line border-y border-line text-[0.8125rem]">
                    <div className="flex items-baseline justify-between gap-4 py-3">
                      <dt className="type-muted">Nomor pesanan</dt>
                      <dd className="tnum font-medium">{order?.number}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4 py-3">
                      <dt className="type-muted">Metode</dt>
                      <dd>{order?.method.label}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4 py-3">
                      <dt className="type-muted">Pengiriman</dt>
                      <dd>{order?.totals.option.label}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4 py-3">
                      <dt className="type-muted">Total</dt>
                      <dd className="tnum font-medium">{formatPrice(order?.totals.total ?? 0)}</dd>
                    </div>
                  </dl>

                  <DemoNotice tone="warn" className="mt-6">
                    <span className="font-medium">Pesanan ini tidak tersimpan di mana pun.</span>{' '}
                    Nomor di atas dibuat di browser Anda dan tidak terdaftar di sistem mana pun.
                    Muat ulang halaman ini dan pesanannya hilang.
                  </DemoNotice>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => leave('/katalog')}
                      className="btn btn-ink flex-1"
                    >
                      Lanjut belanja
                    </button>
                    <button
                      type="button"
                      onClick={() => leave('/')}
                      className="btn btn-outline flex-1"
                    >
                      Ke beranda
                    </button>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* ================= right: what is being paid for ================= */}
        <div className="lg:col-span-5">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.05 }}
            className="glass rounded-[28px] p-6 md:p-7 lg:sticky lg:top-28"
          >
            <h2 className="type-h3 text-[1.0625rem]">
              {step === 'done' ? 'Pesanan Anda' : 'Ringkasan'}
            </h2>
            <OrderSummary lines={viewLines} totals={viewTotals} className="mt-5" />
          </motion.div>
        </div>
      </div>
    </div>
  )
}
