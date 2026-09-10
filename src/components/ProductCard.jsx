import ProductPhoto from './ProductPhoto'
import { formatPrice, discountPercent } from '../lib/format'
import { navigate } from '../lib/router'

/**
 * A product tile.
 *
 * Deliberately sparse: photo, name, price. No star ratings, no fake review
 * counts, no "12 people viewing this" — a curated store earns trust by not
 * shouting.
 *
 * The photograph fills the tile edge to edge rather than sitting inset on a
 * tinted ground, which is what the old SVG did. That tint existed to give
 * twelve line drawings a common ground; real photos bring their own, and
 * padding them would just shrink the product on a phone.
 */
export default function ProductCard({ product, priority = false }) {
  const onSale = Boolean(product.originalPrice)
  const off = discountPercent(product.price, product.originalPrice)

  return (
    <article className="group">
      <a
        href={`#/produk/${product.id}`}
        onClick={(e) => {
          e.preventDefault()
          navigate(`/produk/${product.id}`)
        }}
        className="block"
        aria-label={`${product.name} — ${formatPrice(product.price)}`}
      >
        <div className="tile aspect-[4/5]">
          {/* The photo is the card's accessible name's payload, so it gets a
              real alt. The link around it already carries name + price, so
              this is marked as an image of the product, not a duplicate
              announcement — the alt is the product name and nothing more. */}
          <ProductPhoto
            photo={product.photo}
            alt={product.name}
            priority={priority}
            className="tile-art"
          />

          {/* Badges stack top-left; only one ever shows, tag wins over sale.
              These are frosted so the photo reads through them — the same
              material as the header, at a much smaller scale. */}
          <div className="absolute left-3 top-3 flex gap-1.5">
            {product.tag && <span className="badge badge-quiet">{product.tag}</span>}
            {onSale && !product.tag && <span className="badge badge-sale">−{off}%</span>}
          </div>
        </div>

        {/* Stacked on phones, side-by-side from md up. In a 2-column mobile
            grid a card is only ~167px wide, and the price column would squeeze
            the name column down to ~52px — narrow enough that the material
            line ("Stainless 316L") overflowed its box instead of wrapping.
            Stacking gives the text the full width; the price reads fine
            underneath. */}
        <div className="mt-3.5 flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-4">
          <div className="min-w-0">
            <h3 className="type-h3 truncate text-[0.9375rem] font-medium">{product.name}</h3>
            <p className="mt-0.5 text-[0.8125rem] type-muted">{product.material}</p>
          </div>

          <div className="shrink-0 md:text-right">
            <p className="tnum text-[0.9375rem] font-medium">{formatPrice(product.price)}</p>
            {onSale && (
              <p className="tnum text-[0.75rem] text-faint line-through">
                {formatPrice(product.originalPrice)}
              </p>
            )}
          </div>
        </div>
      </a>
    </article>
  )
}
