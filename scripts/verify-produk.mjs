// Targeted check for the product page's rating, stock badge and admin chat.
//
// Kept apart from verify.mjs because that script sweeps every route; this one
// drives the one page the feature lives on and asserts the things that could
// silently be wrong: that the stars actually reflect the score, that the chat
// opens and replies, and that the stock answer in the chat agrees with the
// badge on the page. That last one is the whole reason the reply is generated
// rather than written, so it is worth a test.
//
// Usage: node --experimental-websocket scripts/verify-produk.mjs [url] [--mobile]

import { spawn } from 'node:child_process'

const args = process.argv.slice(2)
const mobile = args.includes('--mobile')
const url = args.find((a) => !a.startsWith('--')) || 'http://localhost:4174/'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = mobile ? 9951 : 9950

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${process.env.TEMP}\\verify-produk-${port}`,
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
await sleep(2200)

const evaluate = async (expression) => {
  const r = await S('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description)
  return r.result.value
}

const go = async (hash) => {
  await evaluate(`window.location.hash = ${JSON.stringify(hash)}`)
  await sleep(1000)
}

const results = {}

// ---- rating + stock on the page ----------------------------------------
await go('/produk/kaos-katun-berat')
results.rating = await evaluate(`(() => {
  // The id sits on the heading (aria-labelledby points at it), so climb to
  // the section that owns it rather than measuring the heading alone.
  const section = document.getElementById('ulasan')?.closest('section')
  const stars = section?.querySelector('[role="img"]')
  const avg = section?.querySelector('.type-h2')?.textContent.trim()
  const fill = section?.querySelector('[style*="clip-path"]')
  const bars = section ? section.querySelectorAll('li .bg-ink').length : 0
  return {
    sectionPresent: !!section,
    // Scoped to the section: a bare h2 query also catches the chat dialog's
    // title, which is a different component's heading entirely.
    heading: section?.querySelector('h2')?.textContent.trim(),
    average: avg,
    starsLabel: stars?.getAttribute('aria-label'),
    // The clip fraction must match the printed average — a mismatch here is
    // the bug the whole two-row approach exists to avoid.
    clip: fill?.style.clipPath,
    distributionBars: bars,
    // Only the review list; the distribution is a ul of its own.
    reviewsShown: section ? section.querySelectorAll('ul:not(:has(.bg-ink)) > li').length : 0,
    bars: section ? section.querySelectorAll('li .bg-ink').length : 0,
    hasWriteForm: !!Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent.trim().startsWith('Tulis ulasan')),
    // Heading level of the block, for the H1 -> H2 gap check
    h2Count: document.querySelectorAll('h2').length,
    headingOrder: Array.from(document.querySelectorAll('h1,h2,h3'))
      .map(h => h.tagName).join(','),
  }
})()`)

results.stock = await evaluate(`(() => {
  const badge = Array.from(document.querySelectorAll('span'))
    .find(s => ['TERSEDIA','HABIS','BELUM DICEK'].includes(s.textContent.trim().toUpperCase())
      && s.className.includes('rounded-full'))
  const panelText = document.querySelector('.glass')?.textContent ?? ''
  return {
    badge: badge?.textContent.trim(),
    badgeClass: badge?.className.slice(0, 60),
    age: Array.from(document.querySelectorAll('.text-faint'))
      .map(e => e.textContent.trim()).find(t => t.startsWith('dicek')),
    staleWarning: panelText.includes('Catatan stok ini sudah lama'),
    chatButton: !!Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent.includes('Tanya admin')),
  }
})()`)

// ---- chat: open, reply, and agreement with the badge --------------------
results.chat = await evaluate(`(async () => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms))
  const badge = Array.from(document.querySelectorAll('span'))
    .find(s => ['TERSEDIA','HABIS','BELUM DICEK'].includes(s.textContent.trim().toUpperCase())
      && s.className.includes('rounded-full'))?.textContent.trim().toUpperCase()

  Array.from(document.querySelectorAll('button'))
    .find(b => b.textContent.includes('Tanya admin')).click()
  await wait(700)

  const dialog = document.querySelector('[role="dialog"]')
  const title = dialog?.querySelector('h2')?.textContent.trim()
  const autoLabel = dialog?.textContent.includes('Balasan otomatis')
  // Marked in the component rather than reached by child index — the first
  // child is the scrim button, and an index would break the moment the panel
  // gains another block.
  const stockLine = dialog?.querySelector('[data-stock-line]')?.textContent.trim()
  const firstBubble = dialog?.querySelector('ul li')?.textContent.trim()

  // ask about stock
  const chip = Array.from(dialog.querySelectorAll('button'))
    .find(b => b.textContent.trim() === 'Stok masih ada?')
  chip.click()
  await wait(1200)
  const bubbles = Array.from(dialog.querySelectorAll('ul li')).map(li => li.textContent.trim())
  const answer = bubbles.slice(1).join(' ')

  // body must be locked while open, same as the cart
  const locked = document.body.style.overflow === 'hidden'

  dialog.querySelector('button[aria-label="Tutup"]').click()
  await wait(700)
  return {
    opened: !!dialog,
    title,
    labelledAutomatic: autoLabel,
    stockLine,
    firstBubble: firstBubble?.slice(0, 70),
    badgeOnPage: badge,
    replyBubbles: bubbles.length - 1,
    answer: answer.slice(0, 180),
    // The assertion that matters: the chat must not contradict the page.
    agreesWithBadge: badge === 'HABIS'
      ? /habis/i.test(answer)
      : badge === 'TERSEDIA' ? /tersedia|sisa/i.test(answer) : true,
    bodyLocked: locked,
    closedAfter: !document.querySelector('[role="dialog"]'),
    bodyUnlocked: document.body.style.overflow === '',
  }
})()`)

// ---- a stale reading must be admitted, not hidden ----------------------
await go('/produk/jaket-twill')
results.staleCase = await evaluate(`(() => {
  const panel = document.querySelector('.glass')
  return {
    badge: Array.from(document.querySelectorAll('span'))
      .find(s => s.className.includes('rounded-full') && /SISA|TERSEDIA|HABIS/.test(s.textContent.trim().toUpperCase()))
      ?.textContent.trim(),
    admitsStale: panel.textContent.includes('sudah lama'),
    chatFlagged: !!Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent.includes('Cek stok')),
  }
})()`)

// ---- a sold-out product: the mirrored case -----------------------------
await go('/produk/sling-bag')
results.soldOut = await evaluate(`(() => {
  const panel = document.querySelector('.glass')
  return {
    badge: Array.from(document.querySelectorAll('span'))
      .find(s => s.className.includes('rounded-full') && /SISA|TERSEDIA|HABIS/.test(s.textContent.trim().toUpperCase()))
      ?.textContent.trim(),
    admitsStale: panel.textContent.includes('sudah lama'),
  }
})()`)

// ---- layout sanity ------------------------------------------------------
results.layout = await evaluate(`(() => {
  const vw = document.documentElement.clientWidth
  const offscreen = Array.from(document.querySelectorAll('body *')).filter(el => {
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return false
    const cs = getComputedStyle(el)
    if (cs.position === 'absolute' || cs.position === 'fixed') return false
    return r.right > vw + 2 || r.left < -2
  }).slice(0, 5).map(el => ({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0,40) }))
  const clipped = Array.from(document.querySelectorAll('h1,h2,h3,p,span,a,li')).filter(el => {
    const cs = getComputedStyle(el)
    if (cs.overflow !== 'visible' || cs.display === 'inline') return false
    if (!el.textContent.trim()) return false
    return el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0
  }).slice(0, 5).map(el => ({
    tag: el.tagName.toLowerCase(),
    cls: String(el.className).slice(0,40),
    text: el.textContent.trim().slice(0,30),
    scrollW: el.scrollWidth, clientW: el.clientWidth,
  }))
  const small = Array.from(document.querySelectorAll('a,button')).filter(el => {
    const r = el.getBoundingClientRect()
    if (!r.width) return false
    return r.height < 24 || r.width < 24
  }).slice(0, 8).map(el => ({ text: (el.textContent||'').trim().slice(0,20), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) }))
  return {
    overflowX: document.documentElement.scrollWidth > vw + 1,
    offscreen, clipped, smallTargets: small,
    imgWithoutAlt: document.querySelectorAll('img:not([alt])').length,
    buttonsWithoutLabel: Array.from(document.querySelectorAll('button'))
      .filter(b => !b.textContent.trim() && !b.getAttribute('aria-label')).length,
  }
})()`)

// ---- animation still compositor-only ------------------------------------
results.animation = await evaluate(`(() => {
  const anims = document.getAnimations().map(a => {
    const kf = a.effect?.getKeyframes?.() || []
    const props = new Set()
    kf.forEach(f => Object.keys(f).forEach(k => { if (!['offset','easing','composite','computedOffset'].includes(k)) props.add(k) }))
    return { props: Array.from(props) }
  })
  const bad = new Set(['height','width','top','left','margin','padding','filter','background-position'])
  return { running: anims.length, offCompositor: anims.filter(a => a.props.some(p => bad.has(p))).length }
})()`)

const warns = consoleMsgs.filter((m) => m.type === 'error' || m.type === 'warning')

console.log('\n===== PRODUCT FEATURE VERIFY (' + (mobile ? 'MOBILE 390' : 'DESKTOP 1440') + ') =====')
for (const [k, v] of Object.entries(results)) {
  console.log(`\n--- ${k} ---`)
  console.log(JSON.stringify(v, null, 2))
}
console.log('\n--- page errors (' + pageErrors.length + ') ---')
pageErrors.forEach((e) => console.log('  x ' + e.split('\n')[0]))
console.log('\n--- console errors/warnings (' + warns.length + ') ---')
warns.slice(0, 20).forEach((m) => console.log(`  [${m.type}] ${m.text.slice(0, 200)}`))

socket.close()
chrome.kill()
process.exit(pageErrors.length > 0 ? 1 : 0)
