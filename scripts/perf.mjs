// Measures the cost of the glass layer.
//
// The point of this script is to answer one question with a number rather
// than an opinion: does the backdrop-filter work actually cost anything while
// scrolling? It samples frame times during a scripted scroll on the busiest
// page, and separately reports how much of the page is composited.
//
// Usage: node --experimental-websocket scripts/perf.mjs [url] [--mobile]

import { spawn } from 'node:child_process'

const args = process.argv.slice(2)
const mobile = args.includes('--mobile')
const url = args.find((a) => !a.startsWith('--')) || 'http://localhost:4174/'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = mobile ? 9943 : 9942

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${process.env.TEMP}\\perf-${port}`,
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

await S('Runtime.enable')
await S('Page.enable')
if (mobile) {
  await S('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
}
await S('Page.navigate', { url })
await sleep(3000)

const evaluate = async (expression) => {
  const r = await S('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description)
  return r.result.value
}

// Go to the longest page — the catalog, which carries the sticky glass bar
// plus the most product cards.
await evaluate(`window.location.hash = '/katalog'`)
await sleep(1200)

// --- 1. frame timing during a scripted scroll ---------------------------
// Driven from inside the page with rAF so the sampling is honest: a scroll
// issued over CDP would be measured from outside and miss dropped frames.
const frames = await evaluate(`(async () => {
  const times = []
  let last = performance.now()
  let raf
  const tick = (now) => {
    times.push(now - last)
    last = now
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  // scroll the full height in ~60 steps
  const max = document.documentElement.scrollHeight - window.innerHeight
  for (let i = 0; i <= 60; i++) {
    window.scrollTo(0, Math.round((max * i) / 60))
    await new Promise((r) => setTimeout(r, 16))
  }
  cancelAnimationFrame(raf)
  window.scrollTo(0, 0)

  // drop the first frame (the rAF setup) and any >1s outlier (a GC pause)
  const d = times.slice(1).filter((t) => t < 1000)
  d.sort((a, b) => a - b)
  const pct = (p) => d[Math.min(d.length - 1, Math.floor(d.length * p))]
  return {
    samples: d.length,
    median: +pct(0.5).toFixed(1),
    p95: +pct(0.95).toFixed(1),
    worst: +d[d.length - 1].toFixed(1),
    // a frame budget at 60fps is 16.7ms; count how many blew it
    over16: d.filter((t) => t > 16.7).length,
    over32: d.filter((t) => t > 32).length,
  }
})()`)

// --- 2. long tasks ------------------------------------------------------
const longTasks = await evaluate(`(async () => {
  const tasks = []
  const po = new PerformanceObserver((list) => {
    for (const e of list.getEntries()) tasks.push(Math.round(e.duration))
  })
  try { po.observe({ entryTypes: ['longtask'] }) } catch { return { unsupported: true } }
  const max = document.documentElement.scrollHeight - window.innerHeight
  for (let i = 0; i <= 40; i++) {
    window.scrollTo(0, Math.round((max * i) / 40))
    await new Promise((r) => setTimeout(r, 25))
  }
  po.disconnect()
  window.scrollTo(0, 0)
  return { count: tasks.length, durations: tasks.slice(0, 10) }
})()`)

// --- 3. what the page is made of ---------------------------------------
const composition = await evaluate(`(() => {
  const qa = (s) => document.querySelectorAll(s)
  return {
    domNodes: qa('*').length,
    productCards: qa('article').length,
    backdropPanels: qa('.glass, .glass-strong').length,
    // the number that actually matters: how many elements are promoted to
    // their own compositor layer, since each one costs GPU memory
    willChange: Array.from(qa('*')).filter(el => getComputedStyle(el).willChange !== 'auto').length,
    fixedLayers: Array.from(qa('*')).filter(el => {
      const cs = getComputedStyle(el)
      return cs.position === 'fixed' && cs.display !== 'none'
    }).length,
    images: qa('img').length,
    svgs: qa('svg').length,
  }
})()`)

// --- 4. memory ----------------------------------------------------------
const memory = await evaluate(`(() => {
  const m = performance.memory
  if (!m) return { unsupported: true }
  return {
    usedMB: +(m.usedJSHeapSize / 1048576).toFixed(1),
    totalMB: +(m.totalJSHeapSize / 1048576).toFixed(1),
  }
})()`)

console.log('\n===== PERF (' + (mobile ? 'MOBILE 390' : 'DESKTOP 1440') + ') =====')
console.log('\n-- frame times while scrolling the catalog (ms) --')
console.log(JSON.stringify(frames, null, 2))
console.log('\n-- long tasks (>50ms) --')
console.log(JSON.stringify(longTasks, null, 2))
console.log('\n-- composition --')
console.log(JSON.stringify(composition, null, 2))
console.log('\n-- memory --')
console.log(JSON.stringify(memory, null, 2))

socket.close()
chrome.kill()
