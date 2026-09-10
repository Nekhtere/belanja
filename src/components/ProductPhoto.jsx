/**
 * Product photograph.
 *
 * Replaces the old monoline SVG illustrations. The trade is deliberate and
 * worth stating plainly, because it reverses an earlier decision in this
 * project:
 *
 *   SVG  — zero image requests, crisp at any size, twelve objects that read as
 *          one family. But a shopper cannot judge cloth from a line drawing,
 *          and a store whose whole promise is "we picked these because the
 *          material is good" has to actually show the material.
 *   Photo — costs bytes, needs real files. Shows the thing being sold.
 *
 * Four rules keep the photos from wrecking the layout the rest of the site
 * was built around:
 *
 *   1. The wrapper owns the aspect ratio and the crop. Every photo is
 *      `object-cover` inside a fixed-ratio box, so a portrait shot and a
 *      square shot both fill the same frame and nothing reflows.
 *   2. Every image declares `width`/`height`. The box already reserves the
 *      space, but this also lets the browser pick the right intrinsic size
 *      before the file arrives — no layout shift, which matters more here
 *      than anywhere else because the grid is the page.
 *   3. `srcset` carries both renditions so the browser picks by viewport and
 *      DPR. The `sizes` prop is what makes that choice correct — without it
 *      the browser assumes the image is full-viewport wide and picks the
 *      large file every time, which is worse than having no srcset at all.
 *   4. `alt` is always the product name, never the filename and never empty.
 *      A product photo is content, not decoration. The one exception is an
 *      image whose meaning is already carried by adjacent text (the hero
 *      caption, a category tile, a cart thumbnail), where the alt is empty
 *      on purpose — see the call sites.
 */

/**
 * `priority` opts an image out of lazy loading. Use it for the one or two
 * images that are on screen at first paint; lazy-loading those makes them
 * arrive late and visibly pop in.
 *
 * `photo` is `{ sm, lg }` from the catalogue. A bare string is still accepted
 * so a half-migrated entry degrades to a working image instead of a crash.
 */
export default function ProductPhoto({
  photo,
  alt = '',
  className = '',
  priority = false,
  // Describes the width the image actually occupies, which is what lets the
  // browser choose correctly. The catalogue grid is 2 / 3 / 4 columns as the
  // viewport grows, so a card is ~50vw / ~33vw / ~25vw — hence three tiers
  // rather than one. Getting this wrong is worse than having no srcset: the
  // browser assumes 100vw and downloads the largest file every time.
  sizes = '(min-width: 1024px) 25vw, (min-width: 768px) 31vw, 50vw',
}) {
  // A bare string is still accepted so a half-migrated catalogue entry
  // degrades to a working image instead of a crash.
  const sm = typeof photo === 'string' ? undefined : photo?.sm
  const lg = typeof photo === 'string' ? photo : photo?.lg
  const src = lg ?? sm

  if (!src) return null

  // Only emit a srcset when both renditions exist. A one-entry srcset with a
  // dangling `undefined` descriptor is worse than none — the browser would
  // either ignore the whole attribute or pick a URL that 404s.
  const srcSet = sm && lg ? `${sm} 500w, ${lg} 1000w` : undefined

  return (
    <img
      src={src}
      srcSet={srcSet}
      // `sizes` is only meaningful alongside a srcset; without one the
      // browser already has the only candidate there is.
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width="1000"
      height="1250"
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      className={`h-full w-full object-cover ${className}`}
    />
  )
}
