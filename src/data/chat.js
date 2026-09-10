/**
 * Admin chat — canned replies for a store with no backend.
 *
 * The assistant is named "Asisten RUPA" and labelled as automatic rather than
 * given a human name and avatar. That is not a technicality: a chat window
 * that shows a person typing in real time is making a claim about who is on
 * the other end, and this demo cannot honour it. A checkout button that does
 * nothing is a stub; a fake human is a lie. The distinction costs nothing here
 * and keeps the demo honest in a presentation.
 *
 * THE STOCK ANSWER IS GENERATED, NOT WRITTEN
 *
 * This is the one place where the tempting shortcut is clearly wrong. The
 * obvious implementation is a hand-written reply per quick-reply button. But
 * then the page has two independent claims about the same stock level — the
 * badge in the buy panel and the sentence in the chat — and they drift apart
 * the first time either is edited. The reader who notices "Tersedia" on the
 * page and "sedang habis" in the chat has lost trust in both.
 *
 * So `replyFor` reads the same `stockFor()` result the badge does, and the two
 * cannot disagree. The same reasoning as the review histogram in reviews.js:
 * derive it once, from one source.
 *
 * Replies return an ARRAY of bubbles. A single string would force the
 * "here is the answer, and here is what I am doing about it" beat into one
 * paragraph, which is not how the conversation reads.
 */

import { stockAge } from './stock'

/** The opening bubble, before the shopper types anything. */
export function greeting(product, stock) {
  if (stock.soldOut) {
    return `Halo! ${product.name} sedang kosong di sistem kami. Mau saya bantu cek ketersediaan atau kabari kalau sudah masuk lagi?`
  }
  if (stock.stale) {
    return `Halo! Ada yang ingin ditanyakan soal ${product.name}? Catatan stok untuk barang ini sudah agak lama, jadi tanyakan saja kalau mau saya pastikan dulu.`
  }
  return `Halo! Ada yang ingin ditanyakan soal ${product.name}? Saya bisa bantu soal stok, ukuran, bahan, atau pengiriman.`
}

/** The chips offered under the conversation. */
export const QUICK_REPLIES = [
  { id: 'stok', label: 'Stok masih ada?' },
  { id: 'restock', label: 'Kapan restock?' },
  { id: 'kirim', label: 'Bisa kirim hari ini?' },
  { id: 'ukuran', label: 'Bahan dan ukurannya?' },
]

/**
 * Build the assistant's answer to one intent.
 *
 * Returns an array of message bodies. `product` and `stock` come straight from
 * the catalogue and the stock table, so every number quoted here is the same
 * number the page is showing.
 */
export function replyFor(intent, product, stock) {
  switch (intent) {
    case 'stok':
      return stockAnswer(product, stock)

    case 'restock':
      if (stock.soldOut) {
        return [
          `${product.name} masuk daftar tunggu restock. Biasanya 7–14 hari kerja dari pengiriman terakhir, tergantung produsennya.`,
          'Kalau mau, saya kabari begitu barangnya masuk.',
        ]
      }
      return [
        `Stok ${product.name} masih ada, jadi belum ada jadwal restock terdekat.`,
        'Kalau yang Anda incar ukuran atau warna tertentu, sebut saja — saya cek sisa per variannya.',
      ]

    case 'kirim':
      return [
        'Pesanan yang masuk sebelum 14.00 WIB kami kirim hari yang sama, setelah itu dikirim hari kerja berikutnya.',
        'Pengiriman dari Jakarta, biasanya tiba 1–2 hari kerja untuk Pulau Jawa.',
      ]

    case 'ukuran': {
      const sizes = product.sizes?.length
        ? `Ukurannya ${product.sizes.join(', ')}.`
        : 'Barang ini satu ukuran, jadi tidak ada pilihan ukuran.'
      return [
        `Bahannya ${product.material}. ${sizes}`,
        'Kalau ragu antara dua ukuran, sebutkan tinggi dan berat badan Anda — saya bantu pilihkan.',
      ]
    }

    default:
      return [
        'Terima kasih pesannya. Untuk pertanyaan yang lebih spesifik, admin kami akan membalas lewat email atau WhatsApp.',
        'Sementara ini saya bisa bantu soal stok, ukuran, bahan, dan pengiriman.',
      ]
  }
}

/**
 * The stock answer, derived from the live reading.
 *
 * Every branch that quotes a reading also quotes its AGE, because a count with
 * no timestamp is a claim the demo cannot back up. And when the reading is old
 * enough to be doubtful, the answer says so and offers to verify rather than
 * asserting either way — that is the whole point of the feature.
 */
function stockAnswer(product, stock) {
  if (!stock.tracked) {
    return [
      `Untuk ${product.name}, stoknya belum sempat kami catat di sistem — jadi saya tidak mau menebak.`,
      'Saya cek dulu ke gudang ya, nanti saya kabari.',
    ]
  }

  if (stock.soldOut) {
    const out = [
      `${product.name} tercatat habis (${stockAge(stock)}).`,
    ]
    if (stock.stale) {
      // The mirror image of the scenario this feature exists for: the page
      // says "habis", but the reading is old, so it may have been restocked.
      out.push(
        'Tapi catatan itu sudah cukup lama, jadi bisa saja sudah masuk lagi tanpa tercatat. Saya pastikan dulu ke gudang.'
      )
    } else {
      out.push('Saya kabari begitu barangnya masuk lagi.')
    }
    return out
  }

  if (stock.low) {
    const out = [`Sisa ${stock.qty} unit terakhir (${stockAge(stock)}).`]
    if (stock.stale) {
      out.push(
        'Catatan itu sudah beberapa hari, jadi jumlahnya bisa saja sudah berubah. Kalau mau, saya tahan satu dulu sambil Anda putuskan.'
      )
    } else {
      out.push('Kalau mau, saya tahan satu dulu sambil Anda putuskan.')
    }
    return out
  }

  const out = [`Masih tersedia — ${stockAge(stock)}.`]
  if (stock.stale) {
    out.push('Catatan itu sudah agak lama, jadi saya cek ulang dulu supaya pasti.')
  } else {
    out.push('Bisa langsung dipesan, stoknya aman.')
  }
  return out
}

/**
 * The free-text fallback. Deliberately dumb: it looks for a keyword and routes
 * to the matching intent, otherwise returns the generic answer. Anything
 * cleverer would be pretending to understand, and in a demo that is the same
 * mistake as the fake human.
 *
 * ORDER MATTERS, and so does the word list. "ada" was in the stock pattern at
 * first, which meant "ada ukuran L?" — plainly a sizing question — was
 * answered with a stock report. In Indonesian "ada" is close to a filler
 * ("is there…"), so it identifies almost nothing. The stock pattern now only
 * carries words that are unambiguously about stock, and the more specific
 * intents are tested before it: a sentence mentioning both "stok" and "ukuran"
 * is answered about the size, because that is the part the reader cannot
 * already see on the page.
 */
export function intentFromText(text) {
  const t = text.toLowerCase()
  // Most specific first — a question can match several patterns, and the
  // narrower one is the one the shopper actually asked.
  if (/(ukuran|size|bahan|material|kain|muat|pas|ukur)/.test(t)) return 'ukuran'
  if (/(kirim|ongkir|kurir|pengiriman|sampai|sampainya)/.test(t)) return 'kirim'
  if (/(restock|kapan|masuk lagi|tunggu)/.test(t)) return 'restock'
  if (/(stok|ready|tersedia|habis|kosong|sisa)/.test(t)) return 'stok'
  return 'lain'
}
