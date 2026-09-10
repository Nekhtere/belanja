// Screenshots of the new surfaces, for looking at rather than measuring.
//
// The numeric checks confirm nothing is broken; they cannot tell whether the
// result is any good. This writes PNGs of the product page, the review block
// and the chat panel so the layout can actually be seen.
//
// Usage: node --experimental-websocket scripts/shoot.mjs [url] [--mobile]

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const args = process.argv.slice(2)
const mobile = args.includes('--mobile')
const url = args.find((a) => !a.startsWith('--')) || 'http://localhost:4174/'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = mobile ? 9961 : 9960
const OUT = path.resolve(process.cwd(), 'shots')
fs.mkdirSync(OUT, { recursive: true })

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${process.env.TEMP}\\shoot-${port}`,
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
await sleep(2500)

const evaluate = async (expression) => {
  const r = await S('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description)
  return r.result.value
}

const shoot = async (name, { full = false } = {}) => {
  const params = { format: 'png' }
  if (full) params.captureBeyondViewport = true
  const { data } = await S('Page.captureScreenshot', params)
  const file = path.join(OUT, `${name}${mobile ? '-mobile' : ''}.png`)
  fs.writeFileSync(file, Buffer.from(data, 'base64'))
  console.log('  ' + path.relative(process.cwd(), file))
}

const go = async (hash) => {
  await evaluate(`window.location.hash = ${JSON.stringify(hash)}`)
  await sleep(1400)
}

const tag = mobile ? 'mobile' : 'desktop'
console.log(`\nshots (${tag}):`)

// Product page, top — stock badge + rating + chat button.
await go('/produk/jaket-twill')
await shoot('produk-atas')

// Reviews block.
await evaluate(`document.getElementById('ulasan').scrollIntoView({block:'start'})`)
await sleep(1200)
await shoot('ulasan')

// Review form open.
await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().startsWith('Tulis ulasan')).click()`)
await sleep(900)
await shoot('ulasan-form')

// Chat open, with the stale-stock warning showing.
await evaluate(`document.querySelector('form textarea')?.blur(); window.scrollTo(0,0)`)
await sleep(600)
await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Tanya admin')).click()`)
await sleep(1100)
await shoot('chat')

// Chat with a reply in it.
await evaluate(`Array.from(document.querySelectorAll('[role="dialog"] button')).find(b => b.textContent.trim() === 'Stok masih ada?')?.click()`)
await sleep(1500)
await shoot('chat-balasan')

// The sold-out case.
await evaluate(`document.querySelector('[role="dialog"] button[aria-label="Tutup"]').click()`)
await sleep(800)
await go('/produk/sling-bag')
await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Tanya admin')).click()`)
await sleep(1400)
await shoot('chat-habis')

socket.close(); chrome.kill()
console.log('')
