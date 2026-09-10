/**
 * Product reviews — dummy data, like the catalogue itself.
 *
 * Written per product rather than drawn from a shared pool. A pool would be
 * less typing, but a review that says "kancing kerangnya bagus" landing on a
 * t-shirt exposes the trick instantly, and the whole point of showing reviews
 * is that they read as written by someone who actually bought the thing.
 *
 * The average and the star breakdown are COMPUTED from this list, never
 * stored alongside it. Stored twice, they can disagree — and a page that says
 * "4,8 dari 5" above a histogram adding up to 3,9 is worse than no rating at
 * all, because the reader now has proof the numbers are invented. One source,
 * derived once.
 *
 * Dates are display strings ("Agustus 2026") rather than ISO timestamps: they
 * are never sorted or compared, and a locale-formatted date would be the only
 * place in this app that needs a date library to say what it means.
 *
 * `variant` is the size and colour the reviewer says they bought. It is the
 * cheapest possible credibility signal — it proves the review is about a
 * specific purchase, not a mood.
 */

export const REVIEWS = {
  'kaos-katun-berat': [
    {
      name: 'Rizky A.',
      rating: 5,
      date: 'Agustus 2026',
      variant: 'M · Hitam',
      text: 'Katunnya tebal tapi tidak gerah. Sudah lima kali cuci, tidak melar dan tidak ada yang melinting di bagian bawah.',
    },
    {
      name: 'Dinda P.',
      rating: 4,
      date: 'Juli 2026',
      variant: 'S · Hitam',
      text: 'Potongannya lurus dan pas di badan. Hitamnya agak pudar sedikit setelah sering dijemur langsung, tapi wajar untuk katun.',
    },
    {
      name: 'Bagas W.',
      rating: 5,
      date: 'Juli 2026',
      variant: 'XL · Natural',
      text: 'Beli tiga sekaligus. Ukuran XL-nya benar-benar XL, bukan XL yang sempit seperti kebanyakan.',
    },
    {
      name: 'Nadia S.',
      rating: 3,
      date: 'Juni 2026',
      variant: 'M · Natural',
      text: 'Bahannya bagus, tapi warna putihnya sedikit menerawang kalau kena cahaya matahari langsung.',
    },
  ],

  'kemeja-linen': [
    {
      name: 'Arif H.',
      rating: 5,
      date: 'Agustus 2026',
      variant: 'L · Navy',
      text: 'Kancing kerangnya detail kecil yang bikin beda. Kusutnya linen itu wajar dan justru terlihat rapi.',
    },
    {
      name: 'Yuni R.',
      rating: 4,
      date: 'Juli 2026',
      variant: 'M · Krem',
      text: 'Nyaman dipakai di ruangan ber-AC maupun di luar. Sedikit kusut setelah duduk lama, tapi itu memang sifat linen.',
    },
    {
      name: 'Farhan M.',
      rating: 5,
      date: 'Juni 2026',
      variant: 'XL · Hitam',
      text: 'Bahu jatuhnya pas, tidak terlihat kebesaran. Linennya benar-benar linen, bukan campuran poliester.',
    },
    {
      name: 'Sari D.',
      rating: 4,
      date: 'Mei 2026',
      variant: 'S · Natural',
      text: 'Lengan panjangnya pas di pergelangan. Kalau lengan Anda panjang, mungkin terasa sedikit pendek.',
    },
  ],

  'jaket-twill': [
    {
      name: 'Hendra K.',
      rating: 5,
      date: 'Agustus 2026',
      variant: 'L · Zaitun',
      text: 'Twillnya kaku di awal, tapi setelah dua minggu sudah mengikuti bentuk badan. Kantongnya dalam, muat ponsel.',
    },
    {
      name: 'Tami A.',
      rating: 5,
      date: 'Juli 2026',
      variant: 'M · Hitam',
      text: 'Dipakai kerja maupun ke kampus sama-sama cocok. Hangat tapi tidak gerah.',
    },
    {
      name: 'Rio S.',
      rating: 4,
      date: 'Juni 2026',
      variant: 'XL · Navy',
      text: 'Tebal dan rapi. Beratnya terasa, jadi bukan jaket untuk cuaca panas.',
    },
  ],

  'dress-midi': [
    {
      name: 'Laras W.',
      rating: 5,
      date: 'Agustus 2026',
      variant: 'M · Krem',
      text: 'A-line-nya jatuh bersih, tidak menempel di pinggul. Kantong tersembunyinya berguna sekali.',
    },
    {
      name: 'Intan N.',
      rating: 4,
      date: 'Juli 2026',
      variant: 'S · Navy',
      text: 'Lebih jarang kusut dibanding linen murni, benar seperti deskripsinya. Panjangnya pas di bawah lutut saya (160 cm).',
    },
    {
      name: 'Maya F.',
      rating: 5,
      date: 'Juni 2026',
      variant: 'L · Krem',
      text: 'Lapisannya bikin tidak menerawang. Aman untuk kantor tanpa perlu tambahan luar.',
    },
  ],

  'celana-pleated': [
    {
      name: 'Adit P.',
      rating: 4,
      date: 'Agustus 2026',
      variant: '32 · Hitam',
      text: 'Lipatannya tetap rapi setelah dicuci. Pinggang belakangnya elastis, jadi nyaman dipakai duduk lama.',
    },
    {
      name: 'Gilang R.',
      rating: 5,
      date: 'Juli 2026',
      variant: '34 · Coklat',
      text: 'Potongan longgarnya bagus, kaki jadi terlihat lebih panjang. Inseam 105 cm pas untuk saya yang 178 cm.',
    },
    {
      name: 'Wisnu T.',
      rating: 3,
      date: 'Juni 2026',
      variant: '30 · Hitam',
      text: 'Bahannya agak tipis untuk harga segini, tapi potongannya memang bagus.',
    },
  ],

  'tote-kanvas': [
    {
      name: 'Kirana L.',
      rating: 5,
      date: 'Agustus 2026',
      variant: 'Natural',
      text: 'Kanvasnya tebal dan tasnya bisa berdiri sendiri. Laptop 14 inci masuk dengan sisa ruang.',
    },
    {
      name: 'Bayu S.',
      rating: 5,
      date: 'Juli 2026',
      variant: 'Hitam',
      text: 'Jahitan di pegangannya kuat. Sudah dipakai membawa buku berat, tidak ada tanda akan lepas.',
    },
    {
      name: 'Anisa M.',
      rating: 4,
      date: 'Juni 2026',
      variant: 'Zaitun',
      text: 'Muat banyak. Kalau diisi penuh agak berat di bahu karena talinya tipis, tapi untuk harian tidak masalah.',
    },
  ],

  'ransel-daypack': [
    {
      name: 'Dimas A.',
      rating: 5,
      date: 'Agustus 2026',
      variant: 'Hitam',
      text: 'Kompartemen laptopnya benar-benar berlapis busa. Dipakai naik motor tiap hari, laptop aman.',
    },
    {
      name: 'Reza F.',
      rating: 5,
      date: 'Juli 2026',
      variant: 'Navy',
      text: '20 liter pas untuk harian plus sekali menginap. Resletingnya halus dan bisa dibuka satu tangan.',
    },
    {
      name: 'Putri H.',
      rating: 4,
      date: 'Juni 2026',
      variant: 'Coklat',
      text: 'Punggung berlapis busanya nyaman, tapi bagian belakang agak panas kalau dipakai jalan jauh.',
    },
  ],

  'sling-bag': [
    {
      name: 'Fajar N.',
      rating: 5,
      date: 'Juli 2026',
      variant: 'Coklat',
      text: 'Kulitnya menggelap setelah sebulan dan terlihat makin bagus. Muat dompet, ponsel, dan kunci sekaligus.',
    },
    {
      name: 'Rani K.',
      rating: 4,
      date: 'Juni 2026',
      variant: 'Hitam',
      text: 'Kulit nabati asli, terasa beda dari kulit imitasi. Awalnya agak kaku, sekarang sudah lunak.',
    },
    {
      name: 'Yoga P.',
      rating: 5,
      date: 'Mei 2026',
      variant: 'Coklat',
      text: 'Talinya bisa dipindah kiri atau kanan, berguna kalau biasanya pakai bahu kiri.',
    },
  ],

  'parfum-cedar': [
    {
      name: 'Bram S.',
      rating: 5,
      date: 'Agustus 2026',
      variant: '50 ml',
      text: 'Cedar-nya hangat dan tidak menyengat. Tahan sekitar tujuh jam di kulit saya.',
    },
    {
      name: 'Astrid W.',
      rating: 4,
      date: 'Juli 2026',
      variant: '30 ml',
      text: 'Cocok untuk kantor karena tidak menusuk. Vetiver-nya baru terasa di beberapa jam terakhir.',
    },
    {
      name: 'Lukman H.',
      rating: 5,
      date: 'Juni 2026',
      variant: '100 ml',
      text: 'Botol kaca gelapnya bagus, jadi tidak perlu khawatir terkena cahaya.',
    },
  ],

  'parfum-neroli': [
    {
      name: 'Cindy A.',
      rating: 5,
      date: 'Agustus 2026',
      variant: '50 ml',
      text: 'Neroli yang bersih, tidak manis. Aman dipakai ke kantor tanpa membuat pusing orang di sebelah.',
    },
    {
      name: 'Galih D.',
      rating: 4,
      date: 'Juli 2026',
      variant: '30 ml',
      text: 'Ringan dan segar, tapi memang tidak tahan lama — sekitar empat jam, sesuai deskripsinya.',
    },
    {
      name: 'Sinta R.',
      rating: 4,
      date: 'Juni 2026',
      variant: '50 ml',
      text: 'White musk-nya lembut. Cocok untuk yang tidak suka parfum terlalu kuat.',
    },
  ],

  'jam-tangan-minimal': [
    {
      name: 'Ivan T.',
      rating: 5,
      date: 'Agustus 2026',
      variant: 'Krem',
      text: '36 mm pas untuk pergelangan saya yang kecil. Dial-nya bersih dan mudah dibaca.',
    },
    {
      name: 'Nadia K.',
      rating: 5,
      date: 'Juli 2026',
      variant: 'Hitam',
      text: 'Ringan sekali, hampir tidak terasa di pergelangan. Tali kulitnya nyaman dan bisa dilepas cepat.',
    },
    {
      name: 'Aryo B.',
      rating: 4,
      date: 'Juni 2026',
      variant: 'Krem',
      text: 'Tampilannya bersih dan rapi. Tali kulitnya perlu diganti tiap beberapa tahun, tapi itu wajar.',
    },
  ],

  'topi-kanvas': [
    {
      name: 'Sena P.',
      rating: 5,
      date: 'Agustus 2026',
      variant: 'Natural',
      text: 'Bentuknya tetap kokoh, tidak lemas seperti topi murah. Tali logamnya rapi.',
    },
    {
      name: 'Vina L.',
      rating: 4,
      date: 'Juli 2026',
      variant: 'Hitam',
      text: 'Pas di lingkar kepala 57 cm saya. Bagian depan memang diperkuat, jadi tetap berdiri.',
    },
    {
      name: 'Adi W.',
      rating: 5,
      date: 'Juni 2026',
      variant: 'Zaitun',
      text: 'Jahitannya rapi di tiap sambungan. Dipakai naik motor aman karena ada tali pengatur.',
    },
  ],
}

/** How many written reviews are shown before the "show all" control. */
export const REVIEWS_VISIBLE = 3

/**
 * Average, count and per-star breakdown for a list of reviews.
 *
 * Takes the LIST rather than a product id, and that is the important part. The
 * first version took an id and read `REVIEWS` itself — which meant a review
 * written in the session appeared in the list but was missing from the
 * average, so the page showed a 5-star review under a score that had not
 * moved. The fix is not to pass the id and hope; it is to make the summary a
 * pure function of whatever list the caller is actually rendering, so the two
 * cannot describe different things.
 *
 * Returns a zeroed summary for an empty list so callers never have to guard
 * against `undefined` — a product with no reviews is a normal state, not an
 * error.
 */
export function summarize(list) {
  // Index 0 is five stars, so the breakdown reads top-down like a histogram.
  const breakdown = [0, 0, 0, 0, 0]
  for (const r of list) breakdown[5 - r.rating] += 1
  const total = list.reduce((n, r) => n + r.rating, 0)
  return {
    count: list.length,
    average: list.length ? total / list.length : 0,
    breakdown,
  }
}

/** The stored reviews for one product, always an array. */
export const reviewsFor = (productId) => REVIEWS[productId] ?? []
