import { INFORMASI } from '../data/catalog'

/**
 * Footer colophon.
 *
 * Sengaja TIDAK berisi link kategori. Kategori bisa dijangkau dari header
 * sticky yang selalu menempel, menu mobile yang daftarnya identik, tile
 * kategori di beranda, breadcrumb produk, dan CTA "Lihat katalog" — footer
 * hanya akan mengulang link yang sama persis. Argumen SEO link footer juga
 * gugur di sini: routing memakai hash, jadi mesin pencari tidak mengindeks
 * rute sebagai halaman terpisah. Footer akhirnya jadi colophon: identitas,
 * satu grup informasi, dan legal.
 *
 * Grup "Informasi" adalah teks mati (demo tanpa server), jadi ia bukan <nav>:
 * nav yang tidak menyediakan navigasi adalah janji palsu ke screen reader.
 * Item-itemnya duduk dalam satu daftar dua kolom, bukan dua grup terpisah.
 */

export default function Footer() {
  return (
    <footer className="wrap mt-16 pb-6">
      {/* Padding ringan (py-9): footer 409px di desktop awalnya, kini ±330px —
          panel kaca dan seluruh karakternya tetap, yang dipangkas napasnya. */}
      <div className="glass rounded-[32px] px-6 py-9 md:px-10">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="type-h3 text-[1.125rem] tracking-[-0.04em]">RUPA</p>
            <p className="mt-3 max-w-xs text-[0.8125rem] type-muted">
              Toko kurasi pakaian, tas, dan parfum. Kami memilih sedikit barang dan memastikan
              masing-masing bertahan lama.
            </p>
          </div>

          <div className="md:col-span-7">
            <p className="type-label">Informasi</p>
            <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 md:mt-4 md:gap-x-10 md:gap-y-2.5">
              {INFORMASI.map((label) => (
                <li key={label}>
                  <span className="text-[0.8125rem] text-muted">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-1.5 border-t border-line pt-5 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p className="text-[0.75rem] text-faint">
            © {new Date().getFullYear()} RUPA. Situs demo untuk keperluan akademik.
          </p>
          <p className="text-[0.75rem] text-faint">
            Harga sudah termasuk PPN. Gambar produk berupa ilustrasi.
          </p>
        </div>
      </div>
    </footer>
  )
}
