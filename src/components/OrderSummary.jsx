import { formatPrice } from '../lib/format'
import { FREE_SHIPPING_FROM } from '../lib/checkout'

/**
 * The money summary — subtotal, delivery, discount, total.
 *
 * Shared by the cart page and the payment page on purpose. Both screens show
 * the same four numbers, and if they each laid them out themselves they would
 * eventually disagree about one of them — the classic version being a total
 * that includes shipping on the page you pay from and does not on the page
 * you decided from. One component, one set of rows.
 *
 * It takes a `totals` object straight from `totalsFor()` and never computes
 * anything itself. This component's only job is to render numbers it is
 * handed; the arithmetic is in lib/checkout.js.
 */
export default function OrderSummary({ lines, totals, className = '' }) {
  const { subtotal, discount, promo, shipping, freeShipping, total, remainingForFreeShipping } =
    totals

  return (
    <div className={className}>
      {/* --- what is being bought --- */}
      <ul className="divide-y divide-line">
        {lines.map((line) => (
          <li key={line.key} className="flex items-baseline justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="text-[0.8125rem] leading-snug">
                {line.name}
                {line.qty > 1 && <span className="tnum text-muted"> × {line.qty}</span>}
              </p>
              {(line.size || line.colorName) && (
                <p className="mt-0.5 text-[0.75rem] type-muted">
                  {[line.size, line.colorName].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <span className="tnum shrink-0 text-[0.8125rem]">
              {formatPrice(line.price * line.qty)}
            </span>
          </li>
        ))}
      </ul>

      {/* --- the arithmetic --- */}
      <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[0.8125rem]">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="type-muted">Subtotal</dt>
          <dd className="tnum">{formatPrice(subtotal)}</dd>
        </div>

        <div className="flex items-baseline justify-between gap-4">
          <dt className="type-muted">
            Pengiriman
            <span className="ml-1.5 text-[0.75rem] text-faint">{totals.option.label}</span>
          </dt>
          <dd className="tnum">
            {freeShipping ? (
              <>
                <span className="mr-2 text-[0.75rem] text-faint line-through">
                  {formatPrice(totals.option.cost)}
                </span>
                Gratis
              </>
            ) : (
              formatPrice(shipping)
            )}
          </dd>
        </div>

        {/* Only rendered when there is one — an always-present row reading
            "Diskon Rp0" makes a shopper look for the discount they missed. */}
        {discount > 0 && (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="type-muted">
              Diskon
              <span className="ml-1.5 text-[0.75rem] text-faint">{promo.code}</span>
            </dt>
            <dd className="tnum text-sale">−{formatPrice(discount)}</dd>
          </div>
        )}

        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <dt className="type-label">Total</dt>
          <dd className="tnum type-h3 text-[1.125rem]">{formatPrice(total)}</dd>
        </div>
      </dl>

      {/* The nudge. Shown only while there is something left to reach, so it
          can never read "tambah Rp0 lagi". */}
      {remainingForFreeShipping > 0 && (
        <p className="mt-3 rounded-card bg-tile px-3 py-2.5 text-[0.75rem] type-muted">
          Tambah <span className="tnum font-medium text-ink">{formatPrice(remainingForFreeShipping)}</span>{' '}
          lagi untuk gratis pengiriman (dari {formatPrice(FREE_SHIPPING_FROM)}).
        </p>
      )}
    </div>
  )
}
