/**
 * A radio option drawn as a card.
 *
 * Extracted because the shipping picker and the payment-method picker are the
 * same control: a full-width tappable card, a drawn radio, a title, a
 * secondary line, and something on the right. Two hand-rolled copies would
 * drift — one would get the hover state and the other the focus ring.
 *
 * The real `<input type="radio">` is still in the DOM, visually hidden. That
 * matters: it keeps arrow-key navigation between options, the shared `name`
 * grouping, and screen-reader announcement, none of which a div with
 * `onClick` would have. The drawn circle is `aria-hidden` decoration over the
 * top of it.
 *
 * THE FOCUS RING IS ON THE LABEL
 *
 * This is not a stylistic choice. The input is `sr-only`, i.e. clipped to a
 * 1px box, so its own focus outline is drawn somewhere nobody can see it —
 * a keyboard user tabbing through these options would get no indication of
 * where they are. The ring has to be painted on the visible card instead, via
 * the `.focus-ring-host` rule in index.css. See that rule for why it cannot be
 * a Tailwind `peer-*` or `has-[]` utility.
 *
 * The whole card is a `<label>`, so tapping anywhere selects — not just the
 * 20px circle, which is well under a comfortable touch target on a phone.
 */
export default function ChoiceCard({
  name,
  value,
  checked,
  onSelect,
  title,
  subtitle,
  right,
}) {
  return (
    <label
      className={`focus-ring-host flex cursor-pointer items-center gap-4 rounded-card border px-4 py-3.5 transition-colors duration-200 ${
        checked ? 'border-ink bg-paper' : 'border-line bg-paper/50 hover:border-line-strong'
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-200 ${
          checked ? 'border-ink' : 'border-line-strong'
        }`}
      >
        {checked && <span className="size-2.5 rounded-full bg-ink" />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[0.875rem] font-medium">{title}</span>
        {subtitle && <span className="block text-[0.75rem] type-muted">{subtitle}</span>}
      </span>

      {right != null && <span className="tnum shrink-0 text-[0.8125rem]">{right}</span>}
    </label>
  )
}
