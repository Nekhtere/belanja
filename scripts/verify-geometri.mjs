// Geometry audit for the rating, stock badge and chat panel.
//
// Screenshots are for a human to look at; this is the part that can be
// asserted. The failures worth catching here are the ones that are invisible
// in a passing DOM but obvious on screen:
//
//   - the filled star row not landing exactly on the outlined row underneath
//   - the stock badge and the rating link overlapping in a narrow column
//   - the chat panel overflowing the viewport, or its footer running off the
//     bottom because the message list grew
//   - a tap target under 24px on the new controls
//
// Usage: node --experimental-websocket scripts/verify-geometri.mjs [url] [--mobile]

import { spawn } from 'node:child_process'

const args = process.argv.slice(2)
const mobile = args.includes('--mobile')
const url = args.find((a) => !a.startsWith('--')) || 'http://localhost:4174/'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = mobile ? 9971 : 9970

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${process.env.TEMP}\\verify-geometri-${port}`,
  '--no-first-run', '--no-default-browser-check',
  mobile ? '--window-size=390,844' : '--window-size=1440,900',
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
socket.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id)
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result)
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

await S('Runtime.enable'); await S('Page.enable')
if (mobile) {
  await S('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await S('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
}
await S('Page.navigate', { url })
await sleep(2400)

const evaluate = async (expression) => {
  const r = await S('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description)
  return r.result.value
}
const go = async (hash) => {
  await evaluate(`window.location.hash = ${JSON.stringify(hash)}`)
  await sleep(1100)
}

const results = {}

// ---- the buy panel stack ------------------------------------------------
await go('/produk/jaket-twill')
results.panel = await evaluate(`(() => {
  const glass = document.querySelector('.glass')
  const r = (el) => { const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height) } }

  const h1 = glass.querySelector('h1')
  const stars = glass.querySelector('[role="img"]')
  const badge = Array.from(glass.querySelectorAll('span')).find(s => /SISA|TERSEDIA|HABIS/i.test(s.textContent.trim()) && s.className.includes('rounded-full'))
  const warn = Array.from(glass.querySelectorAll('p')).find(p => p.textContent.includes('sudah lama'))
  const price = glass.querySelector('.type-h3')
  const chat = Array.from(glass.querySelectorAll('button')).find(b => b.textContent.includes('Tanya admin'))

  // Does anything in the stack overlap the thing after it?
  const stack = [['h1', h1], ['stars', stars], ['badge', badge], ['warn', warn], ['price', price]]
    .filter(([, el]) => el)
    .map(([name, el]) => ({ name, ...r(el) }))
  const overlaps = []
  for (let i = 1; i < stack.length; i++) {
    if (stack[i].top < stack[i-1].bottom - 1) overlaps.push(stack[i-1].name + ' / ' + stack[i].name)
  }

  // Star rows: the filled overlay must sit exactly on the outlined base.
  const wrap = stars
  const base = wrap.children[0].getBoundingClientRect()
  const fill = wrap.children[1].getBoundingClientRect()
  return {
    stack,
    overlaps,
    starBase: { w: Math.round(base.width), h: Math.round(base.height) },
    starFill: { w: Math.round(fill.width), h: Math.round(fill.height) },
    // Same box means the clip is the only thing doing the work.
    starRowsAligned: Math.abs(base.width - fill.width) < 1 && Math.abs(base.top - fill.top) < 1,
    chatButton: chat ? r(chat) : null,
    chatButtonTall: chat ? chat.getBoundingClientRect().height >= 44 : null,
    panelFitsViewport: glass.getBoundingClientRect().right <= window.innerWidth + 1,
  }
})()`)

// ---- the chat panel -----------------------------------------------------
results.chat = await evaluate(`(async () => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms))
  const r = (el) => { const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height) } }
  Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Tanya admin')).click()
  await wait(900)

  const dialog = document.querySelector('[role="dialog"]')
  const panel = dialog.querySelector('.glass-strong')
  const list = dialog.querySelector('ul')
  const chips = Array.from(dialog.querySelectorAll('button')).filter(b => /Stok masih ada|Kapan restock/.test(b.textContent))
  const input = dialog.querySelector('input[type="text"]')
  const submit = dialog.querySelector('form button[type="submit"]')

  const before = { panel: r(panel), list: r(list) }

  // Push enough messages to make the list overflow, then check the footer
  // still sits inside the panel — the classic sheet bug is a long list
  // shoving the composer off the bottom.
  for (const label of ['Stok masih ada?', 'Kapan restock?', 'Bisa kirim hari ini?']) {
    const chip = Array.from(dialog.querySelectorAll('button')).find(b => b.textContent.trim() === label)
    chip?.click()
    await wait(1100)
  }

  const after = { panel: r(panel), list: r(list), input: r(input), submit: r(submit) }
  const bubbles = dialog.querySelectorAll('ul li').length

  const inside = (child, parent) =>
    child.top >= parent.top - 1 && child.bottom <= parent.bottom + 1

  return {
    panelBefore: before.panel,
    panelAfter: after.panel,
    // The panel must not have grown or moved once messages arrived.
    panelStable: before.panel.h === after.panel.h && before.panel.top === after.panel.top,
    listScrolled: list.scrollHeight > list.clientHeight,
    listScrolls: getComputedStyle(list).overflowY,
    bubbles,
    composerInsidePanel: inside(after.input, after.panel) && inside(after.submit, after.panel),
    submitFullyVisible: after.submit.bottom <= window.innerHeight + 1,
    chipsWrap: chips.length,
    chipHeights: chips.map(c => Math.round(c.getBoundingClientRect().height)),
    inputFits: after.input.right <= after.panel.right + 1,
    panelFitsViewport: after.panel.right <= window.innerWidth + 1 && after.panel.bottom <= window.innerHeight + 1,
  }
})()`)

// ---- small targets among the new controls -------------------------------
results.targets = await evaluate(`(() => {
  const sel = '#ulasan ~ * , [role="dialog"]'
  const dialog = document.querySelector('[role="dialog"]')
  const scope = dialog || document
  const small = Array.from(scope.querySelectorAll('a,button')).filter(el => {
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return false
    return r.height < 24 || r.width < 24
  }).map(el => ({ text: (el.textContent||'').trim().slice(0,20), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) }))
  return { small }
})()`)

console.log(`\n===== GEOMETRY (${mobile ? 'MOBILE 390' : 'DESKTOP 1440'}) =====`)
for (const [k, v] of Object.entries(results)) {
  console.log(`\n--- ${k} ---`)
  console.log(JSON.stringify(v, null, 2))
}

socket.close(); chrome.kill()
