// Headless verification for the RUPA store.
// Drives every route, exercises the cart end to end, and audits layout + a11y
// + the glass/motion layer.
//
// Usage: node --experimental-websocket scripts/verify.mjs [url] [--mobile]

import { spawn } from 'node:child_process'

// Flags may appear in any position; the first non-flag argument is the URL.
// The "does it work from a flashdisk" check lives in scripts/portable.mjs,
// which loads the build over file:// rather than over HTTP.
const args = process.argv.slice(2)
const mobile = args.includes('--mobile')
const url = args.find((a) => !a.startsWith('--')) || 'http://localhost:4174/'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = mobile ? 9941 : 9940

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${process.env.TEMP}\\verify-${port}`,
  '--no-first-run', '--no-default-browser-check',
  '--window-size=1440,900',
  'about:blank',
], { stdio: 'ignore' })

let wsUrl
for (let i = 0; i < 40; i++) {
  try {
    const j = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
    if (j.webSocketDebuggerUrl) { wsUrl = j.webSocketDebuggerUrl; break }
  } catch {}
  await sleep(250)
}
if (!wsUrl) throw new Error('Chrome did not expose a debug endpoint')

const socket = new WebSocket(wsUrl)
await new Promise((res, rej) => { socket.onopen = res; socket.onerror = rej })

let id = 0
const pending = new Map()
const consoleMsgs = []
const pageErrors = []

socket.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id)
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result)
    return
  }
  if (m.method === 'Runtime.consoleAPICalled') {
    consoleMsgs.push({
      type: m.params.type,
      text: (m.params.args || []).map((a) => a.value ?? a.description ?? a.type).join(' '),
    })
  }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails
    pageErrors.push(d.exception?.description || d.text || 'unknown')
  }
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    pageErrors.push(`[${m.params.entry.source}] ${m.params.entry.text}`)
  }
}

const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const msgId = ++id
  pending.set(msgId, { resolve, reject })
  socket.send(JSON.stringify({ id: msgId, method, params, sessionId }))
  setTimeout(() => { if (pending.has(msgId)) { pending.delete(msgId); reject(new Error('timeout ' + method)) } }, 40000)
})

const { targetInfos } = await send('Target.getTargets')
const page = targetInfos.find((t) => t.type === 'page')
const { sessionId } = await send('Target.attachToTarget', { targetId: page.targetId, flatten: true })
const S = (m, p) => send(m, p, sessionId)

await S('Runtime.enable')
await S('Log.enable')
await S('Page.enable')
if (mobile) {
  await S('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await S('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
}
await S('Page.navigate', { url })
await sleep(2500)

const evaluate = async (expression) => {
  const r = await S('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description)
  return r.result.value
}

// Start from a clean cart. The browser profile persists between runs, so
// without this the cart assertions would depend on whatever the last run left
// behind and could pass or fail for the wrong reason.
await evaluate(`try { localStorage.removeItem('belanja.cart.v1') } catch {}`)
await S('Page.reload')
await sleep(2000)

const go = async (hash) => {
  await evaluate(`window.location.hash = ${JSON.stringify(hash)}`)
  await sleep(900)
}

const results = {}

// ---- 0. Glass + motion layer -------------------------------------------
// The whole point of this pass. Checks that the panels actually got a
// backdrop-filter, that the ground they blur is really behind them, and that
// nothing is being animated off the main thread.
await go('/')
results.glass = await evaluate(`(() => {
  const qa = (s) => Array.from(document.querySelectorAll(s))
  const blurs = qa('.glass, .glass-strong').map(el => {
    const cs = getComputedStyle(el)
    return {
      cls: el.className.split(' ').slice(0,2).join(' '),
      backdrop: cs.backdropFilter || cs.webkitBackdropFilter,
      bg: cs.backgroundColor,
      radius: cs.borderTopLeftRadius,
      shadow: cs.boxShadow !== 'none',
    }
  })
  return {
    supportsBackdrop: CSS.supports('backdrop-filter', 'blur(1px)'),
    meshPresent: !!document.querySelector('.ground-mesh'),
    meshPosition: (() => { const m = document.querySelector('.ground-mesh'); return m ? getComputedStyle(m).position : null })(),
    meshPointerEvents: (() => { const m = document.querySelector('.ground-mesh'); return m ? getComputedStyle(m).pointerEvents : null })(),
    panelCount: blurs.length,
    panelsWithBackdrop: blurs.filter(b => b.backdrop && b.backdrop !== 'none').length,
    panelsWithRadius: blurs.filter(b => parseFloat(b.radius) >= 12).length,
    panelsWithShadow: blurs.filter(b => b.shadow).length,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    samples: blurs.slice(0, 6),
  }
})()`)

// ---- 1. Home -----------------------------------------------------------
results.home = await evaluate(`(() => ({
  title: document.title,
  h1: document.querySelector('h1')?.textContent.trim().replace(/\\s+/g,' '),
  h1Count: document.querySelectorAll('h1').length,
  cards: document.querySelectorAll('article').length,
  hasSkipLink: !!document.querySelector('a[href="#main"]'),
  overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
  inkColor: getComputedStyle(document.body).color,
  // nothing may be left at opacity 0 once the reveal has had time to run
  invisibleAfterLoad: Array.from(document.querySelectorAll('h1,h2,h3,p'))
    .filter(el => el.textContent.trim() && getComputedStyle(el).opacity === '0').length,
}))()`)

// ---- 2. Catalog + filter + search + sort -------------------------------
await go('/katalog')
results.catalog = await evaluate(`(() => ({
  title: document.title,
  heading: document.querySelector('h1')?.textContent.trim(),
  cards: document.querySelectorAll('article').length,
  overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
  // Guards the @layer components fix. The .field rule sets width:100%; if it
  // ever escapes that layer again it silently beats sm:w-56 and this width
  // goes back to spanning the whole row.
  searchFieldWidth: Math.round(document.getElementById('cari').getBoundingClientRect().width),
  tileRadius: getComputedStyle(document.querySelector('.tile')).borderTopLeftRadius,
}))()`)

// filter to parfum via the pill. Also checks the pill bar survived: it is
// position:sticky with a backdrop-filter, which is the classic thing a
// browser silently drops.
results.catalogFilter = await evaluate(`(async () => {
  const bar = document.querySelector('.glass.sticky')
  const barStyle = bar ? getComputedStyle(bar) : null
  const pill = Array.from(document.querySelectorAll('[role="radio"]'))
    .find(b => b.textContent.trim() === 'Parfum')
  pill?.click()
  await new Promise(r => setTimeout(r, 800))
  return {
    hash: window.location.hash,
    heading: document.querySelector('h1')?.textContent.trim(),
    cards: document.querySelectorAll('article').length,
    checked: Array.from(document.querySelectorAll('[role="radio"]'))
      .filter(b => b.getAttribute('aria-checked') === 'true').map(b => b.textContent.trim()),
    pillBarSticky: barStyle ? barStyle.position : null,
    pillBarBackdrop: barStyle ? (barStyle.backdropFilter || barStyle.webkitBackdropFilter) : null,
    // the sliding selection indicator is a single absolutely-positioned span
    sliderCount: document.querySelectorAll('.glass.sticky [role="radio"] span').length,
  }
})()`)

// search narrows the grid
results.catalogSearch = await evaluate(`(async () => {
  const before = document.querySelectorAll('article').length
  const input = document.getElementById('cari')
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(input, 'musk')
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await new Promise(r => setTimeout(r, 700))
  return { before, after: document.querySelectorAll('article').length }
})()`)

// sort by price ascending, then confirm the order is actually ascending
results.catalogSort = await evaluate(`(async () => {
  const sel = document.getElementById('urut')
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set
  setter.call(sel, 'murah')
  sel.dispatchEvent(new Event('change', { bubbles: true }))
  await new Promise(r => setTimeout(r, 700))
  const prices = Array.from(document.querySelectorAll('article'))
    .map(a => {
      const m = a.querySelector('.tnum')?.textContent.match(/[\\d.]+/g)
      return m ? Number(m.join('').replace(/\\./g,'')) : null
    })
    .filter(Boolean)
  return { prices, ascending: prices.every((p, i) => i === 0 || p >= prices[i-1]) }
})()`)

// ---- 3. Product detail -------------------------------------------------
await go('/produk/kaos-katun-berat')
results.product = await evaluate(`(() => ({
  title: document.title,
  h1: document.querySelector('h1')?.textContent.trim(),
  hasSizeButtons: document.querySelectorAll('[aria-pressed]').length > 0,
  sizeCount: Array.from(document.querySelectorAll('fieldset'))
    .filter(f => f.querySelector('legend')?.textContent.includes('Ukuran')).length,
  colourSwatches: document.querySelectorAll('button[aria-label="Natural"],button[aria-label="Hitam"]').length,
  details: document.querySelectorAll('li').length,
  buyPanelIsGlass: !!document.querySelector('.glass'),
  overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
}))()`)

// ---- 4. Cart: add, increment, persist, remove --------------------------
results.cart = await evaluate(`(async () => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms))

  // add the product
  const addBtn = Array.from(document.querySelectorAll('button'))
    .find(b => b.textContent.trim() === 'Tambah ke keranjang')
  addBtn.click()
  await wait(400)

  const stored = JSON.parse(localStorage.getItem('belanja.cart.v1') || '[]')

  // open the drawer via the header button
  const openBtn = Array.from(document.querySelectorAll('header button'))
    .find(b => (b.getAttribute('aria-label') || '').startsWith('Keranjang'))
  openBtn.click()
  await wait(700)

  const dialog = document.querySelector('[role="dialog"]')
  const lineCount = dialog ? dialog.querySelectorAll('li').length : 0

  // increment
  const plus = dialog ? Array.from(dialog.querySelectorAll('button'))
    .find(b => (b.getAttribute('aria-label') || '').startsWith('Tambah jumlah')) : null
  plus?.click()
  await wait(300)
  const qtyAfterPlus = JSON.parse(localStorage.getItem('belanja.cart.v1') || '[]')[0]?.qty

  // subtotal should equal price × qty
  const subText = dialog?.querySelector('.tnum')?.textContent ?? ''

  // remove the line
  const del = dialog ? Array.from(dialog.querySelectorAll('button'))
    .find(b => (b.getAttribute('aria-label') || '').startsWith('Hapus')) : null
  del?.click()
  await wait(500)
  const afterDelete = JSON.parse(localStorage.getItem('belanja.cart.v1') || '[]').length

  return {
    storedAfterAdd: stored.length,
    storedQty: stored[0]?.qty,
    drawerOpened: !!dialog,
    drawerLines: lineCount,
    drawerIsGlass: dialog ? (getComputedStyle(dialog.querySelector('.glass-strong') || dialog).backdropFilter || '').includes('blur') : false,
    qtyAfterPlus,
    subtotalText: subText.trim(),
    linesAfterDelete: afterDelete,
  }
})()`)

// close the drawer
await evaluate(`document.querySelector('[role="dialog"] button[aria-label="Tutup"]')?.click()`)
await sleep(900)
results.cartClosed = await evaluate(`({
  dialogGone: !document.querySelector('[role="dialog"]'),
  bodyUnlocked: document.body.style.overflow === '',
})`)

// ---- 5. Cart persistence across a reload -------------------------------
await evaluate(`(async () => {
  const btn = Array.from(document.querySelectorAll('button'))
    .find(b => b.textContent.trim() === 'Tambah ke keranjang')
  btn?.click()
  await new Promise(r => setTimeout(r, 300))
})()`)
await S('Page.reload')
await sleep(2200)
results.cartPersist = await evaluate(`(() => {
  const badge = Array.from(document.querySelectorAll('header button'))
    .find(b => (b.getAttribute('aria-label')||'').startsWith('Keranjang'))
  return { label: badge?.getAttribute('aria-label'), storage: JSON.parse(localStorage.getItem('belanja.cart.v1')||'[]').length }
})()`)

// ---- 6. Unknown route --------------------------------------------------
await go('/halaman-yang-tidak-ada')
results.notFound = await evaluate(`({
  title: document.title,
  h1: document.querySelector('h1')?.textContent.trim(),
})`)

// ---- 7. Header condense on scroll --------------------------------------
await go('/katalog')
results.headerScroll = await evaluate(`(async () => {
  const bar = document.querySelector('header .glass-strong')
  const before = getComputedStyle(bar).borderTopLeftRadius
  window.scrollTo(0, 400)
  await new Promise(r => setTimeout(r, 800))
  const after = getComputedStyle(bar).borderTopLeftRadius
  window.scrollTo(0, 0)
  await new Promise(r => setTimeout(r, 500))
  return { radiusAtTop: before, radiusAfterScroll: after, changed: before !== after }
})()`)

// ---- 7b. images: did they load, and did they shift the layout? ---------
// The photos are the newest and heaviest thing on the page, so they get their
// own audit rather than being folded into the a11y sweep. Two failure modes
// matter: a broken photo (naturalWidth 0) renders as an empty box, and an
// image whose space was not reserved pushes the grid down as it arrives.
await go('/katalog')
results.images = await evaluate(`(async () => {
  await new Promise(r => setTimeout(r, 900))
  const imgs = Array.from(document.querySelectorAll('img'))
  return {
    total: imgs.length,
    loaded: imgs.filter(i => i.complete && i.naturalWidth > 0).length,
    broken: imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.currentSrc || i.src),
    stillLoading: imgs.filter(i => !i.complete).length,
    withAlt: imgs.filter(i => i.alt.trim().length > 0).length,
    decorative: imgs.filter(i => i.alt === '').length,
    withSrcset: imgs.filter(i => i.srcset).length,
    // width/height must be present or the browser cannot reserve the box
    withDimensions: imgs.filter(i => i.getAttribute('width') && i.getAttribute('height')).length,
    lazy: imgs.filter(i => i.loading === 'lazy').length,
    eager: imgs.filter(i => i.loading === 'eager').length,
    // Which rendition the browser actually picked at this viewport. This is
    // the number that proves srcset + sizes are doing their job: if the small
    // file is never chosen on a phone, the srcset is decorative.
    naturalWidths: Array.from(new Set(imgs.map(i => i.naturalWidth))).sort((a, b) => a - b),
    choseSmall: imgs.filter(i => /-sm-/.test(i.currentSrc)).length,
    choseLarge: imgs.filter(i => /-sm-/.test(i.currentSrc) === false && i.currentSrc).length,
    // name any that picked the large file, so "1 of 12" can be judged
    largeOnes: imgs.filter(i => i.currentSrc && !/-sm-/.test(i.currentSrc))
      .map(i => (i.currentSrc.split('/').pop() || '').slice(0, 26)),
    viewport: window.innerWidth,
  }
})()`)

// Layout shift on first load. Measured after a real reload, because CLS that
// happened before the observer existed is only visible through the buffered
// flag — and the shift caused by images is exactly the kind that happens
// during load, before any script of ours runs.
await S('Page.reload')
await sleep(200)
results.layoutShift = await evaluate(`(async () => {
  let cls = 0
  const entries = []
  try {
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue
        cls += e.value
        entries.push({
          value: +e.value.toFixed(4),
          node: e.sources?.[0]?.node?.tagName || '?',
        })
      }
    })
    po.observe({ type: 'layout-shift', buffered: true })
    await new Promise(r => setTimeout(r, 2500))
    po.disconnect()
  } catch { return { unsupported: true } }
  return {
    cls: +cls.toFixed(4),
    // Google's thresholds: under 0.1 good, under 0.25 needs improvement
    rating: cls < 0.1 ? 'good' : cls < 0.25 ? 'needs improvement' : 'poor',
    entries: entries.slice(0, 6),
  }
})()`)

// ---- 8. a11y + layout sweep on the catalog page ------------------------
// The catalog carries the search field and sort select, so this is where
// form labelling actually gets exercised.
results.a11y = await evaluate(`(() => {
  const qa = (s) => Array.from(document.querySelectorAll(s))
  const vw = document.documentElement.clientWidth

  // Anything sticking out horizontally that is not decorative overflow
  const offscreen = qa('body *').filter(el => {
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return false
    const cs = getComputedStyle(el)
    if (cs.position === 'absolute' || cs.position === 'fixed') return false
    return r.right > vw + 2 || r.left < -2
  }).slice(0, 5).map(el => ({
    tag: el.tagName.toLowerCase(),
    cls: (el.className||'').toString().slice(0, 40),
    right: Math.round(el.getBoundingClientRect().right), vw,
  }))

  // Text clipped inside its own box. Reports the overflow/display values and
  // the parent chain too — without them it is impossible to tell a real
  // clipping bug from an element that is merely allowed to overflow.
  const clipped = qa('h1,h2,h3,p,span,a,li').filter(el => {
    const cs = getComputedStyle(el)
    if (cs.overflow !== 'visible' || cs.display === 'inline') return false
    if (!el.textContent.trim()) return false
    return el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0
  }).slice(0, 5).map(el => ({
    tag: el.tagName.toLowerCase(),
    cls: (el.className||'').toString().slice(0,40),
    text: el.textContent.trim().slice(0, 30),
    scrollW: el.scrollWidth, clientW: el.clientWidth,
    overflow: getComputedStyle(el).overflow,
    display: getComputedStyle(el).display,
    parent: (() => {
      const p = el.parentElement
      if (!p) return null
      const cs = getComputedStyle(p)
      return {
        cls: (p.className||'').toString().slice(0,40),
        w: Math.round(p.getBoundingClientRect().width),
        overflow: cs.overflow, minWidth: cs.minWidth,
      }
    })(),
  }))

  const smallTargets = qa('a,button').filter(el => {
    const r = el.getBoundingClientRect()
    if (!r.width) return false
    return r.height < 24 || r.width < 24
  }).slice(0, 8).map(el => {
    const r = el.getBoundingClientRect()
    return { text: (el.textContent||'').trim().slice(0,22), w: Math.round(r.width), h: Math.round(r.height) }
  })

  const inputs = qa('input,select,textarea')
  return {
    offscreen, clipped, smallTargets,
    landmarks: { main: qa('main').length, header: qa('header').length, footer: qa('footer').length, nav: qa('nav').length },
    h1Count: qa('h1').length,
    headingOrder: qa('h1,h2,h3,h4').map(h => h.tagName),
    imgWithoutAlt: qa('img:not([alt])').length,
    buttonsWithoutLabel: qa('button').filter(b => !b.textContent.trim() && !b.getAttribute('aria-label')).length,
    labelledInputs: inputs.filter(el => !!document.querySelector('label[for="'+el.id+'"]') || el.getAttribute('aria-label')).length,
    totalInputs: inputs.length,
    bodyColor: getComputedStyle(document.body).color,
    mutedColor: (() => { const el = document.querySelector('.type-muted'); return el ? getComputedStyle(el).color : null })(),
    // the lightest text colour actually rendered, for a contrast spot-check
    faintColor: (() => { const el = document.querySelector('.text-faint'); return el ? getComputedStyle(el).color : null })(),
  }
})()`)

// ---- 9. reduced motion: content must still be visible ------------------
await S('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
await S('Page.reload')
await sleep(2500)
results.reducedMotion = await evaluate(`(() => {
  const hero = document.querySelector('h1')
  const cs = hero ? getComputedStyle(hero) : null
  // every section must be readable even with animation disabled — the classic
  // failure is a reveal that never fires and leaves the page blank
  const hidden = Array.from(document.querySelectorAll('h1,h2,h3,p,article'))
    .filter(el => getComputedStyle(el).opacity === '0').length
  return {
    matches: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    heroVisible: cs ? cs.opacity !== '0' && cs.visibility !== 'hidden' : false,
    cards: document.querySelectorAll('article').length,
    hiddenElements: hidden,
    meshStillPainted: !!document.querySelector('.ground-mesh'),
  }
})()`)

// ---- 10. compositor-only animation check -------------------------------
// Nothing should be animating a layout-affecting property.
await S('Emulation.setEmulatedMedia', { features: [] })
await go('/')
results.animation = await evaluate(`(() => {
  const anims = document.getAnimations().map(a => {
    const kf = a.effect?.getKeyframes?.() || []
    const props = new Set()
    kf.forEach(f => Object.keys(f).forEach(k => { if (!['offset','easing','composite','computedOffset'].includes(k)) props.add(k) }))
    return { props: Array.from(props) }
  })
  const bad = new Set(['height','width','top','left','margin','padding','filter','background-position'])
  return {
    running: anims.length,
    offCompositor: anims.filter(a => a.props.some(p => bad.has(p))).length,
    sample: anims.slice(0, 5),
  }
})()`)

// ---- output ------------------------------------------------------------
const warns = consoleMsgs.filter((m) => m.type === 'error' || m.type === 'warning')

console.log('\n========== VERIFY (' + (mobile ? 'MOBILE 390' : 'DESKTOP 1440') + ') ==========')
for (const [k, v] of Object.entries(results)) {
  console.log(`\n--- ${k} ---`)
  console.log(JSON.stringify(v, null, 2))
}

console.log('\n--- page errors (' + pageErrors.length + ') ---')
pageErrors.forEach((e) => console.log('  x ' + e.split('\n')[0]))
console.log('\n--- console errors/warnings (' + warns.length + ') ---')
warns.slice(0, 20).forEach((m) => console.log(`  [${m.type}] ${m.text.slice(0, 200)}`))
console.log(`\ntotal console messages: ${consoleMsgs.length}`)

socket.close()
chrome.kill()
process.exit(pageErrors.length > 0 ? 1 : 0)
