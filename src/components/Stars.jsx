/**
 * Star rating.
 *
 * Two rows of five stars stacked on top of each other: the bottom row is
 * outlined, the top row is filled and clipped to the exact fraction. That
 * gives a true 4,6 rather than a rounded 4½ — and rounding is visible here,
 * because the number sits right next to the stars, so any mismatch reads as a
 * bug in a way it would not if the stars stood alone.
 *
 * The whole group is one image to a screen reader. Five separate star glyphs
 * would be announced as five meaningless characters, so the individual stars
 * are `aria-hidden` and the wrapper carries the label — including when the
 * caller passes no `label`, because a widget that silently drops its own value
 * is worse than no widget.
 */

import { formatRating } from '../lib/format'

const STAR =
  'M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5-5.8-3.05L6.2 20.5l1.1-6.5-4.7-4.6 6.5-.95z'

function Row({ size, filled }) {
  return (
    <span className="flex" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
          <path
            d={STAR}
            fill={filled ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  )
}

export default function Stars({ value = 0, size = 14, className = '', label }) {
  // Clamp rather than trust the caller: a bad average must not be able to
  // paint a seventh star or a negative clip, either of which would look like a
  // rendering fault rather than a data one.
  const pct = Math.max(0, Math.min(100, (value / 5) * 100))
  const text = label ?? `${formatRating(value)} dari 5`

  return (
    <span
      className={`relative inline-flex ${className}`}
      role="img"
      aria-label={text}
      title={text}
    >
      {/* Outlined base — the empty stars. */}
      <span className="text-line-strong">
        <Row size={size} filled={false} />
      </span>

      {/* Filled overlay, clipped to the score. `inset(0 X% 0 0)` trims from
          the right, so 4.6 stars leaves 8% of the fifth star showing. A plain
          inline style, not an animated one — nothing here moves. */}
      <span
        className="absolute inset-0 text-ink"
        style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
      >
        <Row size={size} filled />
      </span>
    </span>
  )
}
