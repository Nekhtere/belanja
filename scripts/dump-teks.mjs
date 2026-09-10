// Dumps the rendered text of the new surfaces.
//
// Screenshots come back as pixels I cannot read. What can actually be judged
// is the text: whether the copy is right, whether anything is truncated,
// whether the blocks appear in a sensible order. That is what this prints.
//
// Usage: node --experimental-websocket scripts/dump-teks.mjs [url]

import { spawn } from 'node:child_process'

const args = process.argv.slice(2)
const url = args.find((a) => !a.startsWith('--')) || 'http://localhost:4174/'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = 9972

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${process.env.TEMP}\\dump-teks-${port}`,
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
await S('Page.navigate', { url })
await sleep(2200)

const evaluate = async (expression) => {
  const r = await S('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description)
  return r.result.value
}
const go = async (hash) => {
  await evaluate(`window.location.hash = ${JSON.stringify(hash)}`)
  await sleep(1200)
}

const dump = (sel, label) => evaluate(`(() => {
  const el = ${sel}
  if (!el) return { MISSING: true }
  // Truncation check: a clamped or overflowing text node is the failure that
  // looks fine in a screenshot and wrong in a browser.
  const clipped = Array.from(el.querySelectorAll('p,span,h1,h2,h3,li,a,button'))
    .filter(n => {
      const cs = getComputedStyle(n)
      if (cs.display === 'inline' || cs.overflow !== 'visible') return false
      return n.scrollWidth > n.clientWidth + 2 && n.clientWidth > 0
    })
    .map(n => ({ text: n.textContent.trim().slice(0, 40), scrollW: n.scrollWidth, clientW: n.clientWidth }))
  const text = el.innerText.replace(/\\n{3,}/g, '\\n\\n').trim()
  return { text, clipped }
})()`).then((r) => ({ label, ...r }))

// ---- product page top ---------------------------------------------------
await go('/produk/jaket-twill')
const top = await dump(`document.querySelector('.glass')`, 'PANEL BELI — jaket-twill (Sisa 2, dicek 5 hari lalu)')

// ---- review block -------------------------------------------------------
const rev = await dump(`document.getElementById('ulasan')?.closest('section')`, 'ULASAN')

// ---- review form --------------------------------------------------------
await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().startsWith('Tulis ulasan'))?.click()`)
await sleep(700)
const form = await dump(`document.getElementById('ulasan')?.closest('section')?.querySelector('form')`, 'FORM ULASAN')

// ---- chat: stale low stock ---------------------------------------------
await evaluate(`document.querySelector('form textarea')?.blur()`)
await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Tanya admin')).click()`)
await sleep(900)
const chat1 = await dump(`document.querySelector('[role="dialog"]')`, 'CHAT — jaket-twill, sebelum bertanya')

await evaluate(`Array.from(document.querySelectorAll('[role="dialog"] button')).find(b => b.textContent.trim() === 'Stok masih ada?')?.click()`)
await sleep(1400)
const chat2 = await dump(`document.querySelector('[role="dialog"]')`, 'CHAT — setelah "Stok masih ada?"')

// ---- chat: stale sold out ----------------------------------------------
await evaluate(`document.querySelector('[role="dialog"] button[aria-label="Tutup"]').click()`)
await sleep(600)
await go('/produk/sling-bag')
await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Tanya admin')).click()`)
await sleep(900)
await evaluate(`Array.from(document.querySelectorAll('[role="dialog"] button')).find(b => b.textContent.trim() === 'Stok masih ada?')?.click()`)
await sleep(1400)
const chat3 = await dump(`document.querySelector('[role="dialog"]')`, 'CHAT — sling-bag (Habis, dicek 6 hari lalu)')

for (const r of [top, rev, form, chat1, chat2, chat3]) {
  console.log(`\n${'='.repeat(72)}\n${r.label}\n${'='.repeat(72)}`)
  if (r.MISSING) { console.log('  !! element not found'); continue }
  console.log(r.text)
  if (r.clipped?.length) {
    console.log('\n  !! CLIPPED TEXT:')
    r.clipped.forEach((c) => console.log(`     "${c.text}" (${c.scrollW} > ${c.clientW})`))
  }
}

socket.close(); chrome.kill()
