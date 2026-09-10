// Fetches the 500px rendition of every product photo.
//
// Kept as a script rather than a one-liner so the operation is reviewable and
// re-runnable: the source IDs are here in full, and running it twice is a
// no-op if the files already exist (unless --force).
//
// Usage: node scripts/fetch-sm.mjs [--force]

import fs from 'node:fs'
import path from 'node:path'

const OUT = path.resolve(process.cwd(), 'src/assets/produk')
const force = process.argv.includes('--force')

// Base name -> Unsplash photo id. These are the same masters catalog.js
// documents; the small files are a re-crop of the same photo, not a different
// one, so the grid and the product page always show the same object.
const PHOTOS = {
  kaos: '1521572163474-6864f9cf17ab',
  kemeja: '1596755094514-f87e34085b2c',
  jaket: '1591047139829-d91aecb6caea',
  dress: '1595777457583-95e059d581b8',
  celana: '1594633312681-425c7b97ccd1',
  tote: '1591561954557-26941169b49e',
  ransel: '1553062407-98eeb64c6a62',
  sling: '1548036328-c9fa89d128fa',
  'parfum-cedar': '1541643600914-78b084683601',
  'parfum-neroli': '1594035910387-fea47794261f',
  jam: '1524805444758-089113d48a6d',
  topi: '1521369909029-2afed882baee',
}

const url = (id) =>
  `https://images.unsplash.com/photo-${id}?w=500&h=625&fit=crop&q=72&fm=jpg`

let ok = 0
let failed = 0

for (const [name, id] of Object.entries(PHOTOS)) {
  const dest = path.join(OUT, `${name}-sm.jpg`)

  if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 2000) {
    console.log(`${name}-sm.jpg`.padEnd(24) + 'sudah ada, dilewati')
    ok++
    continue
  }

  try {
    const res = await fetch(url(id), { redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    // A redirect to an error page or an empty body would otherwise be written
    // out as a "valid" file and only show up as a broken image much later.
    if (buf.length < 2000) throw new Error(`terlalu kecil: ${buf.length} byte`)
    fs.writeFileSync(dest, buf)
    console.log(`${name}-sm.jpg`.padEnd(24) + buf.length)
    ok++
  } catch (err) {
    console.log(`${name}-sm.jpg`.padEnd(24) + 'GAGAL: ' + err.message)
    failed++
  }
}

console.log(`\n${ok} berhasil, ${failed} gagal`)
process.exit(failed > 0 ? 1 : 0)
