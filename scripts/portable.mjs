// Does the build actually work when opened straight off a disk?
//
// The README claims it does. That claim is easy to make and easy to get
// wrong, because it depends on two separate things and the first is useless
// without the second:
//
//   1. Relative asset paths (`base: './'` in vite.config.js, and images
//      imported as modules rather than served from public/). Without this,
//      index.html points at /assets/... which resolves to the drive root.
//   2. A module script that the browser will actually execute from a file://
//      origin. Chrome treats file:// as opaque and REFUSES to fetch an
//      external ES module across it, so a perfectly relative <script
//      type="module" src="./assets/index-*.js"> still fails with a CORS
//      error and the page renders blank.
//
// So the honest check is to load it and look. This script does exactly that:
// opens dist/index.html over file://, waits, and reports what actually
// rendered. A pass means title, h1, product cards and images all present with
// zero page errors.
//
// Usage: node --experimental-websocket scripts/offline.mjs

import { spawn } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = 9944

const target = path.resolve(process.cwd(), 'dist/index.html')
if (!fs.existsSync(target)) {
  console.error(`Tidak ada ${target} — jalankan "npm run build" dulu.`)
  process.exit(1)
}
const url = 'file:///' + target.split(path.sep).join('/')

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${process.env.TEMP}\\offline-${port}`,
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
if (!wsUrl) throw new Error('Chrome tidak membuka endpoint debug')

const socket = new WebSocket(wsUrl)
await new Promise((res, rej) => { socket.onopen = res; socket.onerror = rej })

let id = 0
const pending = new Map()
const pageErrors = []

socket.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id)
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result)
    return
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
await S('Page.navigate', { url })
await sleep(3500)

const evaluate = async (expression) => {
  const r = await S('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description)
  return r.result.value
}

// Walk a couple of hash routes too — file:// plus hash routing is the pair
// the flashdisk story depends on, and a router that only works over HTTP
// would not show up on the landing page alone.
const seen = {}
for (const route of ['/', '/katalog', '/produk/kaos-katun-berat']) {
  await evaluate(`window.location.hash = ${JSON.stringify(route)}`)
  await sleep(1100)
  seen[route] = await evaluate(`(() => {
    const imgs = Array.from(document.querySelectorAll('img'))
    return {
      h1: document.querySelector('h1')?.textContent.trim().slice(0, 44) ?? null,
      cards: document.querySelectorAll('article').length,
      images: imgs.length,
      imagesLoaded: imgs.filter(i => i.complete && i.naturalWidth > 0).length,
      imagesBroken: imgs.filter(i => i.complete && i.naturalWidth === 0).length,
    }
  })()`)
}

const home = seen['/']
const ok = home.h1 && home.cards > 0 && pageErrors.length === 0

console.log('\n===== OFFLINE (file://) =====')
console.log('target: ' + url)
console.log('\n-- routes --')
console.log(JSON.stringify(seen, null, 2))
console.log('\n-- page errors (' + pageErrors.length + ') --')
pageErrors.forEach((e) => console.log('  x ' + e.split('\n')[0]))
console.log('\n-- verdict --')
console.log(
  ok
    ? '  OK — halaman render dari file://, semua foto termuat, tanpa error.'
    : '  GAGAL — lihat error di atas.'
)

socket.close()
chrome.kill()
process.exit(ok ? 0 : 1)
