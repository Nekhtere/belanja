/**
 * Verify the cart page and the payment flow.
 *
 * WHAT THIS ACTUALLY CHECKS, AND WHY IT IS THESE THINGS
 *
 * The interesting failure in a checkout is never a crash. It is a TOTAL THAT
 * IS QUIETLY WRONG — off by the shipping charge, or missing the discount on
 * the screen where the shopper actually pays. So most of what follows is not
 * "does the button exist" but "do the two screens agree on the number":
 *
 *   - the subtotal in the DOM equals the sum of the line prices
 *   - total === subtotal - discount + shipping, checked in the DOM
 *   - the total on the CART page equals the total on the PAYMENT page
 *     (this is the one that catches a promo lost between steps)
 *   - the promo cap binds at the right place
 *   - free delivery is decided on the subtotal, so a promo cannot
 *     resurrect the shipping charge
 *
 * It also checks the two honesty claims the design rests on: that the demo
 * account number is visibly an example, and that an uncertain stock count
 * warns without blocking.
 *
 * Run against the preview build:
 *   npm run build && npm run preview
 *   node --experimental-websocket scripts/verify-checkout.mjs
 */

import { spawn } from 'node:child_process'

// slice(2) is load-bearing: process.argv[0] is the node executable and [1] is
// this script's path, so without it the first "non-flag" argument is node.exe
// itself — Chrome is then asked to open that, lands on an error page with an
// opaque origin, and every localStorage call below dies with SecurityError.
const args = process.argv.slice(2)
const url = args.find((a) => !a.startsWith('--')) || 'http://localhost:4174/'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = 9980

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${process.env.TEMP}\\verify-${port}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1440,900',
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
const pageErrors = []

socket.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id)
    pending.delete(m.id)
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
await S('Log.enable')
await S('Page.enable')
await S('Page.navigate', { url })
await sleep(2500)

const evaluate = async (expression) => {
  const r = await S('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description)
  return r.result.value
}

const go = async (hash) => {
  await evaluate(`window.location.hash = ${JSON.stringify(hash)}`)
  await sleep(900)
}

/**
 * Seed the cart straight into localStorage, then reload.
 *
 * Done this way rather than by clicking "Tambah ke keranjang" six times
 * because these tests are about ARITHMETIC, and a test that depends on six
 * clicks also fails when a click misses. The click path is exercised
 * separately by verify.mjs, which owns the cart-drawer flow.
 *
 * THE RELOAD IS LOAD-BEARING. Navigating to a URL that differs only in the
 * fragment is a SAME-DOCUMENT navigation in Chrome: the hash changes, the
 * hash router re-renders, and the React tree is never remounted. CartContext
 * and CheckoutContext read localStorage exactly once, in their initialiser, so
 * without a real reload the seeded cart would sit in storage unread and every
 * assertion below would be measuring an empty page.
 */
const seedCart = async (lines) => {
  await evaluate(`
    window.localStorage.setItem('belanja.cart.v1', ${JSON.stringify(JSON.stringify(lines))});
    window.localStorage.removeItem('belanja.checkout.v1');
  `)
  await S('Page.navigate', { url: url + '#/keranjang' })
  await sleep(250)
  await evaluate(`window.location.reload()`)
  await sleep(2000)
}

/** Shared DOM readers, injected into each evaluate call.
 *
 *  Two traps these are written around, both of which produced false failures
 *  on the first run:
 *
 *   1. Intl formats rupiah as "Rp 122.000" with a NON-BREAKING SPACE between
 *      the symbol and the digits. Comparing against 'Rp122.000' never matches.
 *      Read the digits, not the string.
 *   2. A waived shipping row renders the struck-through original price AND
 *      "Gratis", so stripping digits from the <dd> yields 25000 for an order
 *      that is being charged nothing. Read the raw text and look for "Gratis".
 *
 *  A third is not a helper's problem but every caller's: `.type-label` is
 *  uppercased by CSS, so `innerText` returns "SUBTOTAL". Text matching has to
 *  be case-insensitive.
 */
const HELPERS = `
  const money = (s) => Number(String(s || '').replace(/[^\\d]/g, '')) || 0;
  const ddText = (label) => {
    const dt = [...document.querySelectorAll('dt')].find((d) =>
      d.textContent.trim().toLowerCase().startsWith(label.toLowerCase()));
    return dt ? dt.parentElement.querySelector('dd').textContent : null;
  };
  const ddFor = (label) => { const t = ddText(label); return t === null ? null : money(t); };
  const has = (t) => document.body.innerText.toLowerCase().includes(t.toLowerCase());
  const btnByText = (t) => [...document.querySelectorAll('button')]
    .find((b) => b.textContent.trim().toLowerCase().includes(t.toLowerCase()));
  const setField = (el, value) => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const cartDialog = () => document.querySelector('[role="dialog"][aria-label="Keranjang"]');
`

const results = {}
const step = async (name, fn) => {
  try {
    results[name] = await fn()
  } catch (err) {
    results[name] = { FAILED: String(err.message).split('\n')[0] }
  }
}

const KAOS = {
  id: 'kaos-katun-berat',
  name: 'Kaos Katun Berat',
  price: 189000,
  size: 'M',
  color: '#141413',
  colorName: 'Hitam',
  qty: 2,
  key: 'kaos-katun-berat::M::#141413',
}

const JAM = {
  id: 'jam-tangan-minimal',
  name: 'Jam Tangan Minimal 36mm',
  price: 1250000,
  size: null,
  color: '#141413',
  colorName: 'Hitam',
  qty: 1,
  key: 'jam-tangan-minimal::::#141413',
}

const SLING = {
  id: 'sling-bag',
  name: 'Sling Bag Kulit',
  price: 465000,
  size: null,
  color: '#141413',
  colorName: 'Hitam',
  qty: 1,
  key: 'sling-bag::::#141413',
}

/* ---- 1. the arithmetic on the cart page ------------------------------ */

await step('cart.arithmetic', async () => {
  await seedCart([KAOS])
  return evaluate(`(() => {
    ${HELPERS}
    return {
      subtotal: ddFor('Subtotal'),
      shipping: ddFor('Pengiriman'),
      total: ddFor('Total'),
      // 2 x 189000 = 378000; +25000 reguler = 403000
      subtotalCorrect: ddFor('Subtotal') === 378000,
      totalIsSubtotalPlusShipping: ddFor('Total') === ddFor('Subtotal') + ddFor('Pengiriman'),
    };
  })()`)
})

/* ---- 2. free delivery at the threshold -------------------------------- */

await step('cart.freeShipping', async () => {
  await seedCart([JAM])
  return evaluate(`(() => {
    ${HELPERS}
    return {
      subtotal: ddFor('Subtotal'),
      shippingText: ddText('Pengiriman'),
      total: ddFor('Total'),
      // 1250000 clears the 500000 threshold. Asserted on the TEXT, because a
      // waived row still contains the struck-through original price and would
      // read as 25000 to any digits-only parser.
      shippingWaived: ddText('Pengiriman').includes('Gratis'),
      totalEqualsSubtotal: ddFor('Total') === ddFor('Subtotal'),
      // the nudge must be gone, not reading "tambah Rp 0 lagi"
      nudgeGone: !has('lagi untuk gratis pengiriman'),
    };
  })()`)
})

/* ---- 3. the nudge appears while there is something left to reach ------ */

await step('cart.freeShippingNudge', async () => {
  await seedCart([KAOS])
  return evaluate(`(() => {
    ${HELPERS}
    // 500000 - 378000 = 122000 exactly. Digits only — Intl puts a
    // non-breaking space after "Rp".
    return {
      nudgeShown: has('lagi untuk gratis pengiriman'),
      nudgeAmountCorrect: has('122.000'),
    };
  })()`)
})

/* ---- 4. the promo, and its cap --------------------------------------- */

await step('promo.applies', async () => {
  await seedCart([KAOS])
  return evaluate(`(() => {
    ${HELPERS}
    const input = document.getElementById('promo');
    setField(input, 'RUPA10');
    return { typed: input.value };
  })()`)
    .then(async (typed) => {
      await evaluate(`(() => {
        ${HELPERS}
        const btn = btnByText('Pakai');
        if (btn) btn.click();
      })()`)
      await sleep(600)
      const after = await evaluate(`(() => {
        ${HELPERS}
        return {
          discount: ddFor('Diskon'),
          total: ddFor('Total'),
          subtotal: ddFor('Subtotal'),
          shipping: ddFor('Pengiriman'),
          // 10% of 378000 = 37800, under the 100000 cap
          discountCorrect: ddFor('Diskon') === 37800,
          // 378000 - 37800 + 25000 = 365200
          totalCorrect: ddFor('Total') === 365200,
          // the free-shipping threshold is decided on the SUBTOTAL, so a
          // 378000 order must still be paying for delivery
          shippingStillCharged: ddFor('Pengiriman') === 25000,
        };
      })()`)
      return { ...typed, ...after }
    })
})

await step('promo.capBinds', async () => {
  await seedCart([JAM])
  await evaluate(`(() => {
    ${HELPERS}
    setField(document.getElementById('promo'), 'RUPA10');
    const btn = btnByText('Pakai');
    if (btn) btn.click();
  })()`)
  await sleep(600)
  return evaluate(`(() => {
    ${HELPERS}
    return {
      discount: ddFor('Diskon'),
      total: ddFor('Total'),
      // 10% of 1250000 would be 125000; the cap holds it at 100000
      cappedAt100k: ddFor('Diskon') === 100000,
      // free delivery earned on the subtotal must SURVIVE the discount:
      // 1250000 - 100000 + 0 = 1150000
      freeShippingSurvivedPromo: ddFor('Total') === 1150000,
    };
  })()`)
})

await step('promo.rejects', async () => {
  await seedCart([KAOS])
  await evaluate(`(() => {
    ${HELPERS}
    setField(document.getElementById('promo'), 'BUKAN-KODE');
    const btn = btnByText('Pakai');
    if (btn) btn.click();
  })()`)
  await sleep(600)
  return evaluate(`(() => {
    ${HELPERS}
    return {
      errorShown: document.body.innerText.includes('Kode tidak dikenali'),
      // a bad code must not have changed the money
      totalUnchanged: ddFor('Total') === 403000,
    };
  })()`)
})

/* ---- 5. the address gate --------------------------------------------- */

await step('gate.blockedWithoutAddress', async () => {
  await seedCart([KAOS])
  return evaluate(`(() => {
    ${HELPERS}
    const btn = btnByText('Lanjut ke pembayaran');
    return {
      buttonDisabled: Boolean(btn && btn.disabled),
      reasonStated: document.body.innerText.includes('Isi nama, telepon, alamat, dan kota dulu'),
    };
  })()`)
})

await step('gate.deepLinkBounces', async () => {
  // Typing the payment hash directly must not skip the address step.
  await go('/pembayaran')
  return evaluate(`(() => {
    const txt = document.body.innerText;
    return {
      bounced: txt.includes('Alamat belum lengkap'),
      noPayButton: !txt.includes('Buat pesanan'),
    };
  })()`)
})

/* ---- 6. the flow, end to end ----------------------------------------- */

await step('flow.placeOrder', async () => {
  await seedCart([KAOS])

  // fill the address
  await evaluate(`(() => {
    ${HELPERS}
    const fields = { name: 'Rafi Pratama', phone: '081234567890',
                     street: 'Jl. Engku Putri No. 12', city: 'Batam' };
    for (const [k, v] of Object.entries(fields)) {
      const el = document.getElementById('addr-' + k);
      if (el) setField(el, v);
    }
  })()`)
  await sleep(500)

  const enabled = await evaluate(`(() => {
    ${HELPERS}
    const btn = btnByText('Lanjut ke pembayaran');
    return { buttonEnabled: Boolean(btn && !btn.disabled) };
  })()`)

  await evaluate(`(() => {
    ${HELPERS}
    const btn = btnByText('Lanjut ke pembayaran');
    if (btn) btn.click();
  })()`)
  await sleep(1200)

  const onPayment = await evaluate(`(() => {
    const txt = document.body.innerText;
    return {
      reached: txt.includes('Metode pembayaran'),
      totalShown: (() => {
        const dt = [...document.querySelectorAll('dt')].find((d) =>
          d.textContent.trim().toLowerCase().startsWith('total'));
        return dt ? Number(dt.parentElement.querySelector('dd').textContent.replace(/[^\\d]/g, '')) : null;
      })(),
      addressReadBack: txt.includes('Rafi Pratama') && txt.includes('Batam'),
    };
  })()`)

  // create the order
  await evaluate(`(() => {
    ${HELPERS}
    const btn = btnByText('Buat pesanan');
    if (btn) btn.click();
  })()`)
  await sleep(900)

  const afterOrder = await evaluate(`(() => {
    ${HELPERS}
    const txt = document.body.innerText;
    return {
      instructionsShown: txt.includes('Virtual Account'),
      // the account number must be visibly an example, not just fake
      labelledExample: txt.includes('Nomor contoh') && txt.includes('jangan ditransfer'),
      demoNumber: txt.includes('8808 0000 0000 0000'),
    };
  })()`)

  // claim payment
  await evaluate(`(() => {
    ${HELPERS}
    const btn = btnByText('Saya sudah bayar');
    if (btn) btn.click();
  })()`)
  await sleep(900)

  const done = await evaluate(`(() => {
    ${HELPERS}
    const txt = document.body.innerText;
    const m = txt.match(/RUPA-\\d{4}-\\d{4}/);
    return {
      confirmationShown: txt.includes('Pesanan diterima'),
      orderNumber: m ? m[0] : null,
      orderNumberWellFormed: Boolean(m),
      // the receipt must say the order was not stored anywhere
      honestAboutStorage: txt.includes('tidak tersimpan di mana pun'),
      totalShown: ddFor('Total'),
    };
  })()`)

  return { ...enabled, ...onPayment, ...afterOrder, ...done }
})

/* ---- 7. THE DRIFT CHECK ---------------------------------------------- */
// The total on the page where the shopper DECIDES must equal the total on
// the page where they PAY. This is the bug the shared OrderSummary exists to
// prevent, and it is the single most valuable assertion in this file.

await step('total.matchesAcrossPages', async () => {
  await seedCart([KAOS])
  await evaluate(`(() => {
    ${HELPERS}
    setField(document.getElementById('promo'), 'RUPA10');
    const btn = btnByText('Pakai');
    if (btn) btn.click();
  })()`)
  await sleep(600)
  const onCart = await evaluate(`(() => {
    ${HELPERS}
    return { total: ddFor('Total'), discount: ddFor('Diskon') };
  })()`)

  await evaluate(`(() => {
    ${HELPERS}
    const fields = { name: 'Rafi Pratama', phone: '081234567890',
                     street: 'Jl. Engku Putri No. 12', city: 'Batam' };
    for (const [k, v] of Object.entries(fields)) {
      const el = document.getElementById('addr-' + k);
      if (el) setField(el, v);
    }
  })()`)
  await sleep(400)
  await evaluate(`(() => {
    ${HELPERS}
    const btn = btnByText('Lanjut ke pembayaran');
    if (btn) btn.click();
  })()`)
  await sleep(1200)

  const onPayment = await evaluate(`(() => {
    ${HELPERS}
    return { total: ddFor('Total'), discount: ddFor('Diskon') };
  })()`)

  return {
    cartTotal: onCart.total,
    paymentTotal: onPayment.total,
    cartDiscount: onCart.discount,
    paymentDiscount: onPayment.discount,
    totalsAgree: onCart.total === onPayment.total,
    // If the promo were local to the cart page this would be null here.
    promoSurvivedNavigation: onPayment.discount === 37800,
  }
})

/* ---- 8. an uncertain stock count warns but does not block ------------- */
// sling-bag is recorded as sold out, last checked six days ago. Refusing the
// order on that basis would repeat the exact bug the stock feature exists to
// prevent, so this asserts the warning is present AND the button still works.

await step('stock.warnsWithoutBlocking', async () => {
  await seedCart([SLING])
  const warned = await evaluate(`(() => {
    ${HELPERS}
    const txt = document.body.innerText;
    return {
      warningShown: txt.includes('Tercatat habis'),
      saysStillOrderable: txt.includes('masih bisa dipesan'),
    };
  })()`)

  await evaluate(`(() => {
    ${HELPERS}
    const fields = { name: 'Rafi Pratama', phone: '081234567890',
                     street: 'Jl. Engku Putri No. 12', city: 'Batam' };
    for (const [k, v] of Object.entries(fields)) {
      const el = document.getElementById('addr-' + k);
      if (el) setField(el, v);
    }
  })()`)
  await sleep(500)

  const notBlocked = await evaluate(`(() => {
    ${HELPERS}
    const btn = btnByText('Lanjut ke pembayaran');
    return { buttonEnabledDespiteSoldOut: Boolean(btn && !btn.disabled) };
  })()`)

  return { ...warned, ...notBlocked }
})

/* ---- 9. cash on delivery skips the instructions screen ---------------- */

await step('flow.cod', async () => {
  await seedCart([KAOS])
  await evaluate(`(() => {
    ${HELPERS}
    const fields = { name: 'Rafi Pratama', phone: '081234567890',
                     street: 'Jl. Engku Putri No. 12', city: 'Batam' };
    for (const [k, v] of Object.entries(fields)) {
      const el = document.getElementById('addr-' + k);
      if (el) setField(el, v);
    }
  })()`)
  await sleep(400)
  await evaluate(`(() => {
    ${HELPERS}
    btnByText('Lanjut ke pembayaran')?.click();
  })()`)
  await sleep(1200)

  // pick "Bayar di tempat"
  await evaluate(`(() => {
    const labels = [...document.querySelectorAll('label')];
    const cod = labels.find((l) => l.textContent.includes('Bayar di tempat'));
    cod?.querySelector('input')?.click();
  })()`)
  await sleep(400)

  await evaluate(`(() => {
    ${HELPERS}
    btnByText('Buat pesanan')?.click();
  })()`)
  await sleep(900)

  return evaluate(`(() => {
    const txt = document.body.innerText;
    return {
      // no transfer instructions for a courier-collected order
      skippedInstructions: !txt.includes('Virtual Account'),
      wentStraightToDone: txt.includes('Pesanan diterima'),
      mentionsCourier: txt.includes('Kurir akan menagih'),
    };
  })()`)
})

/* ---- 10. the cart page is reachable from the drawer ------------------- */

await step('nav.drawerToCart', async () => {
  await seedCart([KAOS])
  await go('/')
  await evaluate(`(() => {
    const btn = [...document.querySelectorAll('button')]
      .find((b) => b.getAttribute('aria-label')?.startsWith('Keranjang'));
    btn?.click();
  })()`)
  await sleep(900)

  // Scoped to the dialog, not to document.body. The header's own trigger is
  // still in the DOM behind the scrim, and "Lanjut belanja" also appears on
  // the cart page — matching against the whole body conflates the three.
  const drawerOpen = await evaluate(`(() => {
    ${HELPERS}
    const d = cartDialog();
    return {
      drawerShown: Boolean(d),
      hasCartLink: Boolean(d && d.innerText.includes('Lihat keranjang')),
      // the drawer must NOT offer checkout directly any more — that is the
      // cart page's job, and the old dead button is what this replaced
      noDeadCheckoutButton: Boolean(d && !d.innerText.includes('Lanjut ke pembayaran')),
    };
  })()`)

  await evaluate(`(() => {
    ${HELPERS}
    const d = cartDialog();
    const btn = d && [...d.querySelectorAll('button')].find((b) => b.textContent.includes('Lihat keranjang'));
    btn?.click();
  })()`)
  await sleep(1200)

  const onCart = await evaluate(`(() => {
    ${HELPERS}
    return {
      landedOnCart: has('Alamat pengiriman'),
      drawerClosed: !cartDialog(),
    };
  })()`)

  return { ...drawerOpen, ...onCart }
})

/* ---- 11. layout and focus, at phone width ---------------------------- */
// The two new pages are two-column grids and the summary panel is sticky.
// Both are exactly the kind of layout that quietly overflows a 390px screen,
// and a horizontal scrollbar on a checkout page is the sort of thing nobody
// notices on a desktop monitor.

await step('mobile.noHorizontalOverflow', async () => {
  await S('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  })
  await S('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  await seedCart([KAOS])

  const cart = await evaluate(`(() => {
    ${HELPERS}
    return {
      docWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  })()`)

  await evaluate(`(() => {
    ${HELPERS}
    const fields = { name: 'Rafi Pratama', phone: '081234567890',
                     street: 'Jl. Engku Putri No. 12', city: 'Batam' };
    for (const [k, v] of Object.entries(fields)) {
      const el = document.getElementById('addr-' + k);
      if (el) setField(el, v);
    }
  })()`)
  await sleep(400)
  await evaluate(`(() => {
    ${HELPERS}
    btnByText('Lanjut ke pembayaran')?.click();
  })()`)
  await sleep(1200)

  const payment = await evaluate(`(() => {
    return {
      docWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  })()`)

  await S('Emulation.clearDeviceMetricsOverride')
  await S('Emulation.setTouchEmulationEnabled', { enabled: false })
  return { cart, payment }
})

await step('a11y.focusRingVisible', async () => {
  await seedCart([KAOS])

  /**
   * Tabbed to with real key events, NOT `element.focus()`.
   *
   * A programmatic focus does not match `:focus-visible` — Chrome only applies
   * that pseudo-class when the element is focusable-by-keyboard OR the user's
   * last interaction was the keyboard. Calling `.focus()` in script produced
   * `outlineStyle: "none"` and looked like a CSS failure when it was the test
   * that was wrong.
   *
   * Tabbing also proves the thing that actually matters for a keyboard user:
   * that the hidden radio is REACHABLE by Tab in the first place. An sr-only
   * input that never receives focus would pass a scripted-focus test and be
   * completely unusable.
   */
  let reached = false
  let presses = 0
  for (let i = 0; i < 45 && !reached; i++) {
    await S('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      key: 'Tab',
      code: 'Tab',
      windowsVirtualKeyCode: 9,
      nativeVirtualKeyCode: 9,
    })
    await S('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Tab',
      code: 'Tab',
      windowsVirtualKeyCode: 9,
      nativeVirtualKeyCode: 9,
    })
    presses++
    reached = await evaluate(
      `document.activeElement && document.activeElement.name === 'shipping'`
    )
  }

  if (!reached) return { FAILED: `shipping radio not reachable by Tab (${presses} presses)` }

  return evaluate(`(() => {
    const input = document.activeElement;
    const label = input.closest('label');
    const cs = getComputedStyle(label);
    const rect = label.getBoundingClientRect();
    return {
      tabPressesToReach: ${presses},
      reachedByKeyboard: true,
      outlineStyle: cs.outlineStyle,
      outlineWidth: cs.outlineWidth,
      outlineColor: cs.outlineColor,
      labelWidth: Math.round(rect.width),
      labelHeight: Math.round(rect.height),
      // the ring must be on a box big enough to actually see
      ringOnVisibleCard: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2,
    };
  })()`)
})

/* ---- report ----------------------------------------------------------- */

console.log('\n=== verify-checkout ===\n')
for (const [name, value] of Object.entries(results)) {
  console.log(`--- ${name} ---`)
  console.log(JSON.stringify(value, null, 2))
  console.log()
}

const failed = Object.entries(results).filter(([, v]) => v && v.FAILED)
if (failed.length) {
  console.log(`\n!! ${failed.length} step(s) threw: ${failed.map(([k]) => k).join(', ')}\n`)
}

console.log(`--- page errors (${pageErrors.length}) ---`)
pageErrors.forEach((e) => console.log('  x ' + e.split('\n')[0]))

socket.close()
chrome.kill()
process.exit(pageErrors.length > 0 ? 1 : 0)
