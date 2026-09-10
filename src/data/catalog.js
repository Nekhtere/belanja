/**
 * Product catalogue.
 *
 * Prices are plain integers in rupiah — no floats, no cents. Storing money as
 * a whole number of the smallest unit avoids the rounding errors you get from
 * multiplying decimals, which matters the moment you total a cart.
 *
 * Photographs are IMPORTED rather than dropped in `public/`. Two reasons, and
 * the second is the one that bites:
 *
 *   1. Vite hashes the filename, so a changed photo can never be served from a
 *      stale cache.
 *   2. `public/` assets are referenced by absolute path (`/produk/kaos.jpg`),
 *      which resolves to the drive root when the build is opened straight off
 *      a flashdisk. An imported asset is emitted with a RELATIVE path, so it
 *      keeps working from `file://`. That is the whole point of shipping this
 *      as a folder you can hand someone.
 *
 * All twelve are 4:5 — the same ratio the tiles crop to, so no photo is ever
 * stretched or letterboxed into the grid. Each ships at two widths:
 *
 *   sm  500×625   ~25–65 kB   a phone card is ~180px wide; it must not pull 1000px
 *   lg  1000×1250  ~66–277 kB the product page, and any retina grid
 *
 * Both are declared in a `srcset` so the browser picks by viewport and DPR.
 * A single 1000px file would work, but a phone would then download roughly
 * four times the bytes it can actually display — on the page whose whole
 * design brief is "the merchandise is the point".
 *
 * The files are resolved with `import.meta.glob` rather than 24 hand-written
 * imports. That is not brevity for its own sake: it lets a product's two
 * renditions be looked up as a pair, and — the reason it matters — it keeps
 * working when only the master exists. Drop a `-sm` file in and it is picked
 * up automatically; delete one and the product falls back to the master
 * instead of failing the build. Vite still emits and hashes every file it
 * finds, so the cache-busting property above is unchanged.
 *
 * Source of each photo, so any of them can be re-fetched or re-cropped later.
 * The `-sm` renditions are generated from these masters by scripts/make-sm.ps1
 * rather than downloaded separately, so a local downscale and the original
 * crop cannot disagree:
 *
 *   kaos           images.unsplash.com/photo-1521572163474-6864f9cf17ab
 *   kemeja         images.unsplash.com/photo-1596755094514-f87e34085b2c
 *   jaket          images.unsplash.com/photo-1591047139829-d91aecb6caea
 *   dress          images.unsplash.com/photo-1595777457583-95e059d581b8
 *   celana         images.unsplash.com/photo-1594633312681-425c7b97ccd1
 *   tote           images.unsplash.com/photo-1591561954557-26941169b49e
 *   ransel         images.unsplash.com/photo-1553062407-98eeb64c6a62
 *   sling          images.unsplash.com/photo-1548036328-c9fa89d128fa
 *   parfum-cedar   images.unsplash.com/photo-1541643600914-78b084683601
 *   parfum-neroli  images.unsplash.com/photo-1594035910387-fea47794261f
 *   jam            images.unsplash.com/photo-1524805444758-089113d48a6d
 *   topi           images.unsplash.com/photo-1521369909029-2afed882baee
 */

const PHOTOS = import.meta.glob('../assets/produk/*.jpg', {
  eager: true,
  import: 'default',
})

/**
 * Resolve one product's photo pair by base name, e.g. `photo('kaos')`.
 *
 * A missing master is a hard error on purpose: it means a product is
 * pointing at a file nobody added, which should stop the build rather than
 * ship a product page with a blank tile. A missing small rendition is not an
 * error — that is a graceful downgrade, and `ProductPhoto` handles it.
 */
const photo = (name) => {
  const lg = PHOTOS[`../assets/produk/${name}.jpg`]
  if (!lg) {
    throw new Error(
      `Foto produk tidak ditemukan: src/assets/produk/${name}.jpg — ` +
        `cek ejaan nama berkas di PRODUCTS.`
    )
  }
  return { lg, sm: PHOTOS[`../assets/produk/${name}-sm.jpg`] }
}

export const CATEGORIES = [
  { id: 'semua', label: 'Semua' },
  { id: 'pakaian', label: 'Pakaian' },
  { id: 'tas', label: 'Tas' },
  { id: 'parfum', label: 'Parfum' },
  { id: 'aksesori', label: 'Aksesori' },
]

export const PRODUCTS = [
  {
    id: 'kaos-katun-berat',
    name: 'Kaos Katun Berat',
    category: 'pakaian',
    price: 189000,
    photo: photo('kaos'),
    colors: ['#f4f4f2', '#141413', '#8b8b83'],
    sizes: ['S', 'M', 'L', 'XL'],
    material: 'Katun combed 24s',
    tag: 'Terlaris',
    blurb:
      'Kaos potongan lurus dari katun combed 24s yang tidak menerawang dan tidak melar setelah dicuci berkali-kali.',
    details: [
      'Gramasi 240 gsm, tegak dan tidak transparan',
      'Jahitan rantai di bagian bawah agar tidak melinting',
      'Bahu dijahit silang untuk menahan bentuk',
      'Dibuat di Bandung, dicuci sekali sebelum dikirim',
    ],
  },
  {
    id: 'kemeja-linen',
    name: 'Kemeja Linen Lengan Panjang',
    category: 'pakaian',
    price: 429000,
    photo: photo('kemeja'),
    colors: ['#e8e4d9', '#3c4a52', '#ffffff'],
    sizes: ['S', 'M', 'L', 'XL'],
    material: 'Linen 100%',
    tag: 'Baru',
    blurb:
      'Linen murni yang makin nyaman tiap kali dipakai. Ringan, menyerap keringat, dan justru makin bagus setelah sering dicuci.',
    details: [
      'Linen Eropa 100%, tanpa campuran poliester',
      'Potongan regular dengan bahu jatuh sedikit',
      'Kancing kerang alami, bukan plastik',
      'Setrika suhu sedang atau biarkan kusut — keduanya benar',
    ],
  },
  {
    id: 'jaket-twill',
    name: 'Jaket Twill Chore',
    category: 'pakaian',
    price: 685000,
    photo: photo('jaket'),
    colors: ['#2f3a33', '#141413', '#7a6a52'],
    sizes: ['M', 'L', 'XL'],
    material: 'Twill katun 11 oz',
    blurb:
      'Jaket kerja dengan tiga kantong dan twill tebal yang melunak seiring waktu. Cukup rapi untuk kantor, cukup kuat untuk kerja.',
    details: [
      'Twill katun 11 oz, melunak setelah dipakai',
      'Tiga kantong: dua depan, satu dalam',
      'Kerah bisa ditegakkan, tidak lemas',
      'Bisa dicuci mesin, tetapi akan lebih awet dicuci tangan',
    ],
  },
  {
    id: 'dress-midi',
    name: 'Dress Midi Linen',
    category: 'pakaian',
    price: 549000,
    originalPrice: 699000,
    photo: photo('dress'),
    colors: ['#dfd8c8', '#2b3a45'],
    sizes: ['S', 'M', 'L'],
    material: 'Linen–viskosa',
    blurb:
      'Potongan A-line yang jatuh bersih tanpa menempel. Panjang midi yang aman untuk kantor maupun acara sore.',
    details: [
      'Campuran linen dan viskosa — lebih jarang kusut dari linen murni',
      'Resleting tersembunyi di belakang',
      'Dua kantong tersembunyi di sisi',
      'Ada lapisan dalam di bagian badan',
    ],
  },
  {
    id: 'celana-pleated',
    name: 'Celana Pleated Loose',
    category: 'pakaian',
    price: 389000,
    photo: photo('celana'),
    colors: ['#141413', '#5c5648', '#d8d3c8'],
    sizes: ['28', '30', '32', '34'],
    material: 'Poly–twill',
    blurb:
      'Potongan longgar dengan lipatan depan yang bikin kaki terlihat lebih panjang tanpa terasa sempit di pinggul.',
    details: [
      'Lipatan permanen, tetap rapi setelah dicuci',
      'Pinggang elastis di bagian belakang',
      'Dua kantong samping dan dua kantong belakang',
      'Tersedia panjang inseam 100 cm dan 105 cm',
    ],
  },
  {
    id: 'tote-kanvas',
    name: 'Tote Kanvas Berat',
    category: 'tas',
    price: 259000,
    photo: photo('tote'),
    colors: ['#e3ded1', '#141413', '#4a5a44'],
    material: 'Kanvas katun 16 oz',
    tag: 'Terlaris',
    blurb:
      'Kanvas 16 oz yang berdiri sendiri saat diletakkan. Muat laptop 15 inci, buku, dan botol air sekaligus.',
    details: [
      'Kanvas katun 16 oz, tebal dan tidak kusut',
      'Muat laptop hingga 15 inci di kantong dalam',
      'Pegangan diperkuat jahitan silang di titik tarik',
      'Dasar rata sehingga tas bisa berdiri',
    ],
  },
  {
    id: 'ransel-daypack',
    name: 'Ransel Daypack 20L',
    category: 'tas',
    price: 749000,
    photo: photo('ransel'),
    colors: ['#141413', '#3a4a5a', '#6b6357'],
    material: 'Kanvas berlapis',
    tag: 'Baru',
    blurb:
      'Ransel harian 20 liter dengan punggung berlapis busa dan kompartemen laptop terpisah yang benar-benar melindungi.',
    details: [
      'Kapasitas 20 liter, cukup untuk harian dan sekali menginap',
      'Kompartemen laptop berlapis busa hingga 16 inci',
      'Resleting YKK, bisa dibuka satu tangan',
      'Punggung dan tali bahu berlapis busa bernapas',
    ],
  },
  {
    id: 'sling-bag',
    name: 'Sling Bag Kulit',
    category: 'tas',
    price: 465000,
    photo: photo('sling'),
    colors: ['#4a3423', '#141413'],
    material: 'Kulit sapi nabati',
    blurb:
      'Kulit samak nabati yang menggelap dan membentuk pola pemakaian. Cukup untuk dompet, ponsel, dan kunci.',
    details: [
      'Kulit sapi samak nabati, bukan kulit imitasi',
      'Akan menggelap seiring waktu — ini disengaja',
      'Tiga ruang, satu dengan resleting',
      'Tali bisa disetel untuk kiri atau kanan',
    ],
  },
  {
    id: 'parfum-cedar',
    name: 'Cedar & Vetiver',
    category: 'parfum',
    price: 720000,
    photo: photo('parfum-cedar'),
    colors: ['#d9d4c8'],
    sizes: ['30 ml', '50 ml', '100 ml'],
    material: 'Eau de parfum',
    tag: 'Terlaris',
    blurb:
      'Kayu cedar yang hangat dengan vetiver di bawahnya. Tenang dan dewasa — cocok untuk ruangan, bukan untuk menarik perhatian.',
    notes: { atas: 'Bergamot, lada hitam', tengah: 'Cedar, cendana', dasar: 'Vetiver, ambar' },
    details: [
      'Konsentrasi eau de parfum 18%, tahan 6–8 jam',
      'Dibotolkan dalam kaca gelap agar tidak cepat rusak',
      'Tanpa pewarna dan tanpa ftalat',
      'Dibuat dalam batch kecil',
    ],
  },
  {
    id: 'parfum-neroli',
    name: 'Neroli & White Musk',
    category: 'parfum',
    price: 680000,
    photo: photo('parfum-neroli'),
    colors: ['#e6e0d2'],
    sizes: ['30 ml', '50 ml'],
    material: 'Eau de parfum',
    blurb:
      'Bunga neroli yang bersih dengan musk lembut. Ringan dan tidak menyengat — aman dipakai ke kantor.',
    notes: { atas: 'Neroli, jeruk bergamot', tengah: 'Melati, petitgrain', dasar: 'White musk, cedar' },
    details: [
      'Konsentrasi eau de parfum 15%, tahan 5–6 jam',
      'Aroma floral yang tidak manis berlebihan',
      'Cocok untuk pemakaian harian dan ruangan ber-AC',
      'Kemasan kaca daur ulang',
    ],
  },
  {
    id: 'jam-tangan-minimal',
    name: 'Jam Tangan Minimal 36mm',
    category: 'aksesori',
    price: 1250000,
    originalPrice: 1490000,
    photo: photo('jam'),
    colors: ['#c9c5ba', '#141413'],
    material: 'Stainless 316L',
    blurb:
      'Dial bersih tanpa angka, 36 mm — ukuran yang pas untuk hampir semua pergelangan, bukan hanya yang besar.',
    details: [
      'Diameter 36 mm, tebal 8 mm, ringan di pergelangan',
      'Tahan air 5 ATM (aman untuk cuci tangan)',
      'Gerakan quartz Jepang, baterai 3 tahun',
      'Tali kulit asli dengan pelepasan cepat',
    ],
  },
  {
    id: 'topi-kanvas',
    name: 'Topi Kanvas Six-Panel',
    category: 'aksesori',
    price: 175000,
    photo: photo('topi'),
    colors: ['#e3ded1', '#141413', '#5a6b52'],
    material: 'Kanvas katun',
    blurb:
      'Enam panel dengan tali pengatur logam. Bentuknya tetap kokoh, tidak lemas seperti topi murah.',
    details: [
      'Enam panel dengan jahitan ganda di tiap sambungan',
      'Tali pengatur logam, bukan plastik',
      'Bagian depan diperkuat agar tetap berdiri',
      'Satu ukuran, cocok untuk lingkar kepala 54–60 cm',
    ],
  },
]

/** Cheapest-per-category helper for the "mulai dari" label on category cards. */
export const categoryFromPrice = (categoryId) => {
  const inCat = PRODUCTS.filter((p) => p.category === categoryId)
  if (!inCat.length) return null
  return Math.min(...inCat.map((p) => p.price))
}

export const findProduct = (id) => PRODUCTS.find((p) => p.id === id) ?? null
