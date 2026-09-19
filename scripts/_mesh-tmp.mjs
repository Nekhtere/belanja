// Throwaway. Composites .ground-mesh the way the browser does and finds its
// darkest point, so the contrast figures in index.css are recomputed rather
// than guessed. Also solves for cool-hued equivalents of the warm neutrals at
// IDENTICAL luminance, so swapping the palette cannot move a single contrast
// ratio. Delete after use.
const REM = 16

const lin = (c) => {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
const contrast = (a, b) => {
  const la = lum(a)
  const lb = lum(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
const hex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

/** CSS paints the FIRST background layer on top, so composite bottom-up. */
function darkestPoint(layers, ground, W, H) {
  const g = rgb(ground)
  let best = null
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      let r = g[0]
      let gg = g[1]
      let b = g[2]
      for (const L of [...layers].reverse()) {
        const d = Math.hypot((x - L.cx * W) / (L.rx * REM), (y - L.cy * H) / (L.ry * REM))
        const a = Math.max(0, L.a * (1 - d / L.stop))
        r = L.c[0] * a + r * (1 - a)
        gg = L.c[1] * a + gg * (1 - a)
        b = L.c[2] * a + b * (1 - a)
      }
      const px = [r, gg, b]
      const l = lum(px)
      if (!best || l < best.l) best = { l, px, x, y }
    }
  }
  return best
}

/* ---- RGB <-> HSL, for hue-shifting at constant lightness ----------------- */
function toHsl([r, g, b]) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (!d) return [0, 0, l]
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h, s, l]
}
function fromHsl([h, s, l]) {
  if (!s) return [l * 255, l * 255, l * 255]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const f = (t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]
}

/** Hue-shift, then nudge lightness until luminance matches the original. */
function cool(hexIn, hue) {
  const src = rgb(hexIn)
  const [h, s, l] = toHsl(src)
  let out = fromHsl([hue / 360, s, l])
  const target = lum(src)
  // 30 bisection steps on lightness.
  let lo = 0
  let hi = 1
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    const cand = fromHsl([hue / 360, s, mid])
    if (lum(cand) < target) lo = mid
    else hi = mid
  }
  out = fromHsl([hue / 360, s, (lo + hi) / 2])
  return hex(out)
}

/* ==========================================================================
   1. the mesh
   ========================================================================== */
const CURRENT = {
  ground: '#faf9f7',
  layers: [
    { rx: 58, ry: 38, cx: 0.1, cy: -0.1, c: [255, 219, 194], a: 0.55, stop: 0.62 },
    { rx: 48, ry: 34, cx: 0.9, cy: 0.02, c: [210, 217, 255], a: 0.5, stop: 0.64 },
    { rx: 44, ry: 32, cx: 0.74, cy: 0.98, c: [255, 226, 213], a: 0.42, stop: 0.62 },
    { rx: 40, ry: 30, cx: 0.0, cy: 0.76, c: [215, 240, 231], a: 0.4, stop: 0.6 },
  ],
}

// Sea blue, aqua-forward: cyan -> azure -> aquamarine -> sea blue.
const SEA_A = {
  ground: '#fafbfc',
  layers: [
    { rx: 58, ry: 38, cx: 0.1, cy: -0.1, c: [186, 228, 238], a: 0.55, stop: 0.62 },
    { rx: 48, ry: 34, cx: 0.9, cy: 0.02, c: [196, 220, 250], a: 0.5, stop: 0.64 },
    { rx: 44, ry: 32, cx: 0.74, cy: 0.98, c: [182, 226, 222], a: 0.42, stop: 0.62 },
    { rx: 40, ry: 30, cx: 0.0, cy: 0.76, c: [200, 226, 246], a: 0.4, stop: 0.6 },
  ],
}

const TEXT = { ink: '#141413', muted: '#5c5c56', faint: '#6d6d67' }
const VIEWPORTS = [
  ['desktop', 1440, 900],
  ['phone', 390, 844],
  ['wide', 1920, 1080],
]

/* Match the old mesh's darkest luminance exactly, so no documented contrast
   figure moves. */
const targetL = darkestPoint(CURRENT.layers, CURRENT.ground, 1440, 900).l
const blend = (c, t) => c.map((v) => v + (255 - v) * t)
let lo = 0
let hi = 1
for (let i = 0; i < 40; i++) {
  const mid = (lo + hi) / 2
  const p = { ...SEA_A, layers: SEA_A.layers.map((L) => ({ ...L, c: blend(L.c, mid) })) }
  if (darkestPoint(p.layers, p.ground, 1440, 900).l < targetL) lo = mid
  else hi = mid
}
const t = (lo + hi) / 2
const SEA = { ...SEA_A, layers: SEA_A.layers.map((L) => ({ ...L, c: blend(L.c, t) })) }

console.log(`current darkest luminance ${targetL.toFixed(6)}; blend t = ${t.toFixed(4)}`)
console.log('\nmesh layers (cool):')
for (const L of SEA.layers) console.log(`  rgb(${L.c.map((v) => Math.round(v)).join(' ')} / ${L.a})`)

console.log('\ncontrast, before -> after:')
for (const [vp, W, H] of VIEWPORTS) {
  const a = darkestPoint(CURRENT.layers, CURRENT.ground, W, H)
  const b = darkestPoint(SEA.layers, SEA.ground, W, H)
  const row = (t2) =>
    Object.entries(TEXT)
      .map(([k, v]) => `${k} ${contrast(rgb(v), t2.px).toFixed(2)}`)
      .join('  ')
  console.log(`  ${vp.padEnd(8)} old [${row(a)}]  new [${row(b)}]`)
}

/* ==========================================================================
   2. the neutral ramp — cool equivalents at identical luminance
   ========================================================================== */
console.log('\nneutrals (hue 210), luminance-preserving:')
const NEUTRALS = {
  ground: '#faf9f7',
  tile: '#f4f4f2',
  line: '#e5e5e1',
  lineStrong: '#d4d4cf',
  ink: '#141413',
  muted: '#5c5c56',
  faint: '#6d6d67',
  inkHover: '#33332f',
}
const coolMap = {}
for (const [name, v] of Object.entries(NEUTRALS)) {
  const c = cool(v, 210)
  coolMap[name] = c
  const dl = (lum(rgb(c)) - lum(rgb(v))).toFixed(6)
  console.log(`  ${name.padEnd(11)} ${v} -> ${c}   dLuminance ${dl}`)
}

/* Does the sale accent still clear AA on the new ground, and on the darkest
   point of the new mesh? */
console.log('\nsale accent #a8442a on the new ground:')
const nd = darkestPoint(SEA.layers, SEA.ground, 1440, 900)
console.log(`  on ground    ${contrast(rgb('#a8442a'), rgb(SEA.ground)).toFixed(2)}`)
console.log(`  on mesh dark ${contrast(rgb('#a8442a'), nd.px).toFixed(2)}`)
console.log(`  on paper     ${contrast(rgb('#a8442a'), [255, 255, 255]).toFixed(2)}`)

/* And the paper that glass panels are tinted from — white stays white, but
   check the muted/faint text against a mid-glass composite. */
console.log('\nfinal pick:')
console.log(`  --color-ground: ${SEA.ground}   (was ${CURRENT.ground})`)
for (const L of SEA.layers) {
  const c = L.c.map((v) => Math.round(v))
  console.log(`  radial-gradient(... rgb(${c.join(' ')} / ${L.a}) ...)`)
}
