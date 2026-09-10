// Drives the interactive paths the other checks only look at: writing a
// review, and the chat's answers for the two stale-stock cases.
//
// The stale cases are the scenario the feature was requested for. The page
// says "Sisa 2" or "Habis", but the reading is days old, so the honest answer
// is "that may have changed" rather than a flat repeat of the badge. Worth
// asserting, because the easy implementation just echoes the badge — and then
// the chat adds nothing the page did not already say.
//
// Usage: node --experimental-websocket scripts/verify-ulasan.mjs [url]

import { spawn } from 'node:child_process'

const args = process.argv.slice(2)
const url = args.find((a) => !a.startsWith('--')) || 'http://localhost:4174/'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = 9952

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${process.env.TEMP}\\verify-ulasan-${port}`,
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
const pageErrors = []
const consoleMsgs = []

socket.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id)
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result)
    return
  }
  if (m.method === 'Runtime.consoleAPICalled') {
    consoleMsgs.push({ type: m.params.type, text: (m.params.args || []).map((a) => a.value ?? a.description ?? a.type).join(' ') })
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

await S('Runtime.enable'); await S('Log.enable'); await S('Page.enable')
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

// Run one block, recording a failure rather than aborting the run — otherwise
// a break in step 1 hides whether steps 2–4 also broke.
const step = async (name, fn) => {
  try {
    results[name] = await fn()
  } catch (err) {
    results[name] = { FAILED: String(err.message).split('\n')[0] }
  }
}

// ---- writing a review ---------------------------------------------------
await go('/produk/kaos-katun-berat')
await step('writeReview', () =>
  evaluate(`(async () => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms))
  const sec = () => document.getElementById('ulasan').closest('section')
  const listOf = () => Array.from(sec().querySelectorAll('ul:not(:has(.bg-ink)) > li'))
  const before = listOf().length
  const avgBefore = sec().querySelector('.type-h2').textContent.trim()

  Array.from(document.querySelectorAll('button'))
    .find(b => b.textContent.trim().startsWith('Tulis ulasan')).click()
  await wait(500)

  const form = sec().querySelector('form')
  const submitBtn = Array.from(form.querySelectorAll('button')).find(b => b.type === 'submit')
  const disabledEmpty = submitBtn.disabled

  Array.from(form.querySelectorAll('button[aria-label$="bintang"]'))
    .find(b => b.getAttribute('aria-label') === '5 bintang').click()
  await wait(200)
  const disabledAfterRatingOnly = submitBtn.disabled

  const set = (el, v) => {
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement : window.HTMLInputElement
    Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  set(form.querySelector('input[type="text"]'), 'Penguji Otomatis')
  set(form.querySelector('textarea'), 'Dipakai dua minggu, jahitannya masih rapi dan tidak ada yang melinting.')
  await wait(200)
  const enabledWithBothFields = !submitBtn.disabled

  submitBtn.click()
  await wait(700)

  const after = listOf()
  const avgAfter = sec().querySelector('.type-h2').textContent.trim()
  return {
    reviewsBefore: before,
    avgBefore,
    disabledEmpty,
    disabledAfterRatingOnly,
    enabledWithBothFields,
    formClosedAfterSubmit: !sec().querySelector('form'),
    reviewsAfter: after.length,
    newest: after[0]?.textContent.trim().slice(0, 70),
    avgAfter,
    // A 5-star review dropped into a set averaging 4,3 must raise it.
    averageWentUp: parseFloat(avgAfter.replace(',', '.')) > parseFloat(avgBefore.replace(',', '.')),
  }
})()`)
)

// ---- chat answer for a stale "habis" -----------------------------------
await go('/produk/sling-bag')
await step('soldOutChat', () =>
  evaluate(`(async () => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms))
  Array.from(document.querySelectorAll('button'))
    .find(b => b.textContent.includes('Tanya admin')).click()
  await wait(700)
  const dialog = document.querySelector('[role="dialog"]')
  const opening = dialog.querySelector('ul li').textContent.trim()

  Array.from(dialog.querySelectorAll('button'))
    .find(b => b.textContent.trim() === 'Stok masih ada?').click()
  await wait(1300)

  // Everything after the greeting. The count varies by product (a sold-out
  // reply is two bubbles, a low-stock reply is two, the greeting is one), so
  // slice rather than index — an off-by-one here looks like a copy bug.
  const bubbles = Array.from(dialog.querySelectorAll('ul li')).map(li => li.textContent.trim())
  const answer = bubbles.slice(1).join(' ')
  const stockLine = dialog.querySelector('[data-stock-line]').textContent.trim()
  dialog.querySelector('button[aria-label="Tutup"]').click()
  await wait(600)
  return {
    stockLine,
    opening: opening.slice(0, 90),
    answer: answer.slice(0, 230),
    // Says it is out...
    saysOut: /habis/i.test(answer),
    // ...but also that the reading is old enough to be wrong. This is the
    // mirror of "in stock but actually sold out", and the reason the reply is
    // generated from the stock table rather than written by hand.
    admitsMayHaveChanged: /sudah cukup lama|masuk lagi|pastikan/i.test(answer),
    quotesAge: /6 hari lalu/.test(answer),
  }
})()`)
)

// ---- chat answer for a stale low-stock ---------------------------------
await go('/produk/jaket-twill')
await step('lowStockChat', () =>
  evaluate(`(async () => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms))
  Array.from(document.querySelectorAll('button'))
    .find(b => b.textContent.includes('Tanya admin')).click()
  await wait(700)
  const dialog = document.querySelector('[role="dialog"]')
  Array.from(dialog.querySelectorAll('button'))
    .find(b => b.textContent.trim() === 'Stok masih ada?').click()
  await wait(1300)
  const bubbles = Array.from(dialog.querySelectorAll('ul li')).map(li => li.textContent.trim())
  const answer = bubbles.slice(1).join(' ')
  dialog.querySelector('button[aria-label="Tutup"]').click()
  await wait(500)
  return {
    answer: answer.slice(0, 230),
    quotesCount: /Sisa 2/.test(answer),
    quotesAge: /5 hari lalu/.test(answer),
    offersToHold: /tahan satu/i.test(answer),
    admitsStale: /sudah beberapa hari.*bisa saja sudah berubah/i.test(answer),
  }
})()`)
)

// ---- free text routes to the right intent ------------------------------
await step('freeText', () =>
  evaluate(`(async () => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms))
  Array.from(document.querySelectorAll('button'))
    .find(b => b.textContent.includes('Tanya admin')).click()
  await wait(700)
  const dialog = document.querySelector('[role="dialog"]')
  const input = dialog.querySelector('input[type="text"]')
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    .call(input, 'bahannya apa dan ada ukuran L?')
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await wait(200)
  dialog.querySelector('form button[type="submit"]').click()
  await wait(1300)
  const bubbles = Array.from(dialog.querySelectorAll('ul li')).map(li => li.textContent.trim())
  const answer = bubbles.slice(1).join(' ')
  dialog.querySelector('button[aria-label="Tutup"]').click()
  await wait(500)
  return {
    asked: bubbles[1]?.slice(0, 45),
    answer: answer.slice(0, 210),
    mentionsMaterial: /Twill katun/i.test(answer),
    mentionsSizes: /M, L, XL/.test(answer),
  }
})()`)
)

const warns = consoleMsgs.filter((m) => m.type === 'error' || m.type === 'warning')
console.log('\n===== REVIEW + CHAT PATHS =====')
for (const [k, v] of Object.entries(results)) {
  console.log(`\n--- ${k} ---`)
  console.log(JSON.stringify(v, null, 2))
}
console.log('\n--- page errors (' + pageErrors.length + ') ---')
pageErrors.forEach((e) => console.log('  x ' + e.split('\n')[0]))
console.log('--- console errors/warnings (' + warns.length + ') ---')
warns.slice(0, 10).forEach((m) => console.log(`  [${m.type}] ${m.text.slice(0, 160)}`))

socket.close(); chrome.kill()
process.exit(pageErrors.length > 0 ? 1 : 0)
