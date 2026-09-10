/**
 * Shared motion vocabulary.
 *
 * Two rules hold everywhere in this app:
 *
 *   1. Only `transform` and `opacity` are animated. Both are handled by the
 *      compositor, so a page full of moving elements still scrolls at 60fps.
 *      Animating `height`, `top`, or `filter` would push the work back onto
 *      the main thread and is the usual reason a "smooth" site stutters.
 *
 *   2. Distances are small. Apple's motion is restrained — 12–20px of travel,
 *      not 60. The feel comes from the easing curve, not the distance.
 *
 * Reduced motion is handled globally by <MotionConfig reducedMotion="user">
 * in main.jsx, which makes Motion skip transform/opacity animation for anyone
 * who asks for it. Nothing here needs to check the media query itself.
 */

/** Apple's curve: quick departure, long settle. */
export const EASE = [0.32, 0.72, 0, 1]

/** A softer one for things that fade in place. */
export const EASE_OUT = [0.16, 1, 0.3, 1]

/** Spring used for anything that should feel physical rather than timed. */
export const SPRING = { type: 'spring', stiffness: 320, damping: 34, mass: 0.9 }

/** Scroll-triggered reveal. Pair with `whileInView` + `viewport`. */
export const riseIn = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
}

/** Parent for staggered children. */
export const stagger = (each = 0.06, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: each, delayChildren: delay } },
})

/**
 * The standard viewport config. `once` matters: re-animating on every scroll
 * past is what makes a site feel twitchy, and `amount` at 0.2 means the
 * element is meaningfully on screen before it moves.
 */
export const viewport = { once: true, amount: 0.2 }

/** Route transition — a short cross-fade with a little lift. */
export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.22, ease: EASE } },
}
