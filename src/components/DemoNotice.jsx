/**
 * The demo disclosure.
 *
 * A component rather than a paragraph repeated on each screen, because the
 * claim has to be IDENTICAL everywhere it appears. Three slightly different
 * wordings of "this is not real" across the cart, the payment step and the
 * confirmation would each look like a caveat someone added in a hurry — and
 * the one screen that phrased it most weakly would be the one people believe.
 *
 * This is the same rule the admin chat follows when it says "Balasan otomatis
 * · bukan admin manusia": the interface states what it is, on the screen where
 * it matters, rather than relying on the reader having been told elsewhere.
 *
 * `tone="warn"` is for the screens where money is about to change hands and
 * the reader is most likely to be skimming. It is not decoration — it is the
 * difference between a notice and a notice that gets read.
 */
export default function DemoNotice({ tone = 'info', children, className = '' }) {
  const warn = tone === 'warn'
  return (
    <div
      className={`flex items-start gap-3 rounded-card border px-4 py-3 text-[0.75rem] leading-relaxed ${
        warn ? 'border-sale/30 bg-sale/[0.06] text-ink' : 'border-line bg-tile/60 type-muted'
      } ${className}`}
    >
      <span aria-hidden="true" className={`mt-px shrink-0 ${warn ? 'text-sale' : 'text-faint'}`}>
        {warn ? '⚠' : 'ⓘ'}
      </span>
      <p>
        {children ?? (
          <>
            <span className="font-medium">Demo tanpa server.</span> Tidak ada pembayaran yang
            benar-benar diproses, dan tidak ada data yang dikirim ke mana pun.
          </>
        )}
      </p>
    </div>
  )
}
