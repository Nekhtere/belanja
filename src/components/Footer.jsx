import { CATEGORIES } from '../data/catalog'
import { navigate } from '../lib/router'

const BANTUAN = ['Cara memesan', 'Pengiriman', 'Penukaran', 'Panduan ukuran']
const TENTANG = ['Tentang kami', 'Bahan & perawatan', 'Keberlanjutan', 'Kontak']

export default function Footer() {
  const go = (to) => (e) => {
    e.preventDefault()
    navigate(to)
  }

  return (
    <footer className="wrap mt-24 pb-6">
      <div className="glass rounded-[32px] px-6 py-12 md:px-10 md:py-14">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="type-h3 text-[1.125rem] tracking-[-0.04em]">RUPA</p>
            <p className="mt-3 max-w-xs text-[0.8125rem] type-muted">
              Toko kurasi pakaian, tas, dan parfum. Kami memilih sedikit barang dan memastikan
              masing-masing bertahan lama.
            </p>
          </div>

          <nav aria-label="Kategori" className="md:col-span-3">
            <p className="type-label">Kategori</p>
            <ul className="mt-4 space-y-2.5">
              {CATEGORIES.filter((c) => c.id !== 'semua').map((c) => (
                <li key={c.id}>
                  <a
                    href={`#/katalog?kategori=${c.id}`}
                    onClick={go(`/katalog?kategori=${c.id}`)}
                    className="ul-hover -mx-2 inline-block px-2 py-1 text-[0.8125rem] text-muted transition-colors duration-200 hover:text-ink"
                  >
                    {c.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Bantuan" className="md:col-span-3">
            <p className="type-label">Bantuan</p>
            <ul className="mt-4 space-y-2.5">
              {BANTUAN.map((label) => (
                <li key={label}>
                  <span className="text-[0.8125rem] text-muted">{label}</span>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Perusahaan" className="md:col-span-2">
            <p className="type-label">Perusahaan</p>
            <ul className="mt-4 space-y-2.5">
              {TENTANG.map((label) => (
                <li key={label}>
                  <span className="text-[0.8125rem] text-muted">{label}</span>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
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
