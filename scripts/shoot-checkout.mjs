// Screenshots of the cart page and the payment flow, for looking at rather
// than measuring.
//
// The numeric checks in verify-checkout.mjs confirm the arithmetic is right;
// they cannot tell whether the result is any good. This writes PNGs so the
// layout can actually be seen.
//
// Usage: node --experimental-websocket scripts/shoot-checkout.mjs [url] [--mobile]

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const args = process.argv.slice(2)
const mobile = args.includes('--mobile')
const url = args.find((a) => !a.startsWith('--')) || 'http://localhost:4174/'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = mobile ? 9987 : 9986
const OUT = path.resolve(process.cwd(), 'shots')
fs.mkdirSync(OUT, { recursive: true })

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${process.env.TEMP}\\shoot-${port}`,
    '--no-first-run',
    '--no-default-browser-check',
    mobile ? '--window-size=390,844' : '--window-size=1440,900',
    'about:blank',
  ],
  { stdio: 'ignore' }
)

let wsUrl
for (let i = 0; i < 40; i++) {
  try {
    const j = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
    if (j.webSocketDebuggerUrl) {
      wsUrl = j.webSocketDebuggerUrl
      break
    }
  } catch {}
  await sleep(250)
}
if (!wsUrl) throw new Error('Chrome did not expose a debug endpoint')

const socket = new WebSocket(wsUrl)
await new Promise((res, rej) => {
  socket.onopen = res
  socket.onerror = rej
})

let id = 0
const pending = new Map()
socket.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id)
    pending.delete(m.id)
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result)
  }
}
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const msgId = ++id
    pending.set(msgId, { resolve, reject })
    socket.send(JSON.stringify({ id: msgId, method, params, sessionId }))
    setTimeout(() => {
      if (pending.has(msgId)) {
        pending.delete(msgId)
        reject(new Error('timeout ' + method))
      }
    }, 40000)
  })

const { targetInfos } = await send('Target.getTargets')
const page = targetInfos.find((t) => t.type === 'page')
const { sessionId } = await send('Target.attachToTarget', { targetId: page.targetId, flatten: true })
const S = (m, p) => send(m, p, sessionId)

await S('Runtime.enable')
await S('Page.enable')
if (mobile) {
  await S('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  })
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

const HELPERS = `
  const btnByText = (t) => [...document.querySelectorAll('button')]
    .find((b) => b.textContent.trim().toLowerCase().includes(t.toLowerCase()));
  const setField = (el, value) => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
`

/** Seed a cart worth looking at: three lines, one of them over the threshold. */
const seed = async (lines) => {
  await evaluate(`window.localStorage.setItem('belanja.cart.v1', ${JSON.stringify(JSON.stringify(lines))})`)
  await evaluate(`window.localStorage.removeItem('belanja.checkout.v1')`)
  await S('Page.navigate', { url: url + '#/keranjang' })
  await sleep(250)
  await evaluate(`window.location.reload()`)
  await sleep(2200)
}

const THREE = [
  {
    id: 'jaket-twill',
    name: 'Jaket Twill Chore',
    price: 685000,
    size: 'L',
    color: '#8b8b83',
    colorName: 'Abu',
    qty: 1,
    key: 'jaket-twill::L::#8b8b83',
  },
  {
    id: 'sling-bag',
    name: 'Sling Bag Kulit',
    price: 465000,
    size: null,
    color: '#8b8b83',
    colorName: 'Abu',
    qty: 1,
    key: 'sling-bag::::#8b8b83',
  },
  {
    id: 'kaos-katun-berat',
    name: 'Kaos Katun Berat',
    price: 189000,
    size: 'M',
    color: '#141413',
    colorName: 'Hitam',
    qty: 2,
    key: 'kaos-katun-berat::M::#141413',
  },
]

// Empty cart.
await seed([])
await shoot('keranjang-kosong')

// Cart with items, no address filled — the disabled state with its reason.
await seed(THREE)
await shoot('keranjang', { full: true })

// The promo applied.
await evaluate(`(() => {
  ${HELPERS}
  setField(document.getElementById('promo'), 'RUPA10');
  btnByText('Pakai')?.click();
})()`)
await sleep(900)
await shoot('keranjang-promo')

// Filled address, ready to continue.
await evaluate(`(() => {
  ${HELPERS}
  const fields = { name: 'Rafi Pratama', phone: '081234567890',
                   street: 'Jl. Engku Putri No. 12, Batam Centre', city: 'Batam',
                   postcode: '29400', note: 'Titip ke resepsionis kalau saya belum pulang' };
  for (const [k, v] of Object.entries(fields)) {
    const el = document.getElementById('addr-' + k);
    if (el) setField(el, v);
  }
})()`)
await sleep(700)
await shoot('keranjang-terisi', { full: true })

// Payment step.
await evaluate(`(() => { ${HELPERS} btnByText('Lanjut ke pembayaran')?.click(); })()`)
await sleep(1500)
await shoot('pembayaran-metode')

// Order created -> transfer instructions.
await evaluate(`(() => { ${HELPERS} btnByText('Buat pesanan')?.click(); })()`)
await sleep(1300)
await shoot('pembayaran-transfer')

// Confirmation.
await evaluate(`(() => { ${HELPERS} btnByText('Saya sudah bayar')?.click(); })()`)
await sleep(1300)
await shoot('pembayaran-selesai')

socket.close()
chrome.kill()
