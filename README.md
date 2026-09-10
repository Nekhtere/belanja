# RUPA — Toko Pakaian, Tas & Parfum

Situs toko dengan gaya Apple: permukaan kaca (glass blur), sudut membulat,
dan gerak yang halus. Latar tetap terang supaya barang dagangan yang jadi
fokus — tapi kali ini latarnya bukan putih datar, melainkan mesh warna samar
yang jadi bahan pantulan panel kaca di atasnya.

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # hasil di dist/
npm run preview    # http://localhost:4174
```

Routing memakai hash, bukan history API, jadi build ini **tidak butuh aturan
rewrite di server** — semua rute jalan dari satu `index.html`. Itu yang
memudahkan hosting di mana saja.

Tapi build ini **tidak bisa** dibuka dengan klik dua kali pada
`dist/index.html`. Dua hal berbeda diperlukan, dan yang pertama tidak ada
gunanya tanpa yang kedua:

1. **Path aset relatif** — sudah diperbaiki lewat `base: './'` di
   `vite.config.js` dan foto yang diimpor sebagai modul. Tanpa ini,
   `index.html` menunjuk ke `/assets/...` yang jadi akar drive.
2. **Skrip modul yang boleh dijalankan dari `file://`** — ini yang tidak bisa
   dipenuhi. Chrome dan Firefox memperlakukan `file://` sebagai origin buram
   dan **menolak** mengambil modul ES eksternal lintas origin itu. Jadi
   `<script type="module" src="./assets/index-*.js">` tetap gagal dengan error
   CORS dan halamannya kosong — walau path-nya sudah benar.

`scripts/portable.mjs` membuktikannya, dan inilah keluaran sebenarnya:

```
Access to script at 'file:///D:/belanja/dist/assets/index-*.js' from origin
'null' has been blocked by CORS policy: Cross origin requests are only
supported for protocol schemes: chrome, chrome-extension, chrome-untrusted,
data, http, https, isolated-app.
```

Yang penting: pesan itu menyebut **`origin 'null'`**, bukan path yang salah.
Path-nya sudah benar (`./assets/...`); yang ditolak adalah skemanya. Jadi
memperbaiki path tidak akan pernah menyelesaikan ini — hanya server (atau
skrip yang di-inline) yang bisa.

Untuk presentasi dari flashdisk, jalankan server statis dulu:

```bash
npm run build
npx vite preview --port 4174     # buka http://localhost:4174
```

Satu perintah, dan tidak butuh `npm install` ulang karena `vite` sudah ada di
`devDependencies`. Kalau memang harus benar-benar tanpa server sama sekali,
jalan keluarnya `vite-plugin-singlefile`, yang menaruh JS dan CSS langsung di
dalam HTML — skrip modul *inline* boleh jalan dari `file://`, yang eksternal
tidak. Belum dipakai di sini karena menambah dependensi.

`scripts/portable.mjs` menguji klaim ini apa adanya: ia memuat
`dist/index.html` lewat `file://` dan melaporkan apa yang benar-benar
ter-render. Jalankan setelah `npm run build`.

## Struktur

```
src/
  styles/index.css      design token + komponen dasar (satu file)
  lib/motion.js         kosakata gerak bersama (easing, variant, viewport)
  data/catalog.js       katalog produk (12 barang) + kategori
  data/stock.js         stok tiap barang — beserta umur pembacaannya
  data/reviews.js       ulasan awal 12 barang + summarize()
  data/chat.js          balasan asisten; jawaban stok dihasilkan, bukan ditulis
  store/CartContext.jsx keranjang: reducer + localStorage
  store/ReviewsContext.jsx  satu sumber untuk skor & daftar ulasan
  lib/router.js         hash router (~55 baris, tanpa dependensi)
  lib/format.js         format rupiah, hitung diskon, formatRating
  assets/produk/        24 foto produk (12 barang × 1000px & 500px)
  components/           Header, Footer, ProductCard, ProductPhoto, CartDrawer,
                        Stars, Reviews, AdminChat
  pages/                Home, Catalog, Product
scripts/verify.mjs      uji otomatis via Chrome DevTools Protocol
scripts/verify-produk.mjs   uji rating + stok + chat di halaman produk
scripts/verify-ulasan.mjs   jalankan jalur interaktif: tulis ulasan, tanya stok
scripts/verify-geometri.mjs ukur tata letak (bukan lihat screenshot)
scripts/perf.mjs        ukur frame time saat scroll (dengan & tanpa --mobile)
scripts/shoot.mjs       tangkap layar permukaan baru ke shots/
scripts/dump-teks.mjs   cetak teks ter-render (cek copy & teks terpotong)
scripts/portable.mjs    uji apa benar build jalan dari file:// (ternyata tidak)
scripts/fetch-sm.mjs    unduh foto versi 500px dari Unsplash
scripts/make-sm.ps1     turunkan foto versi 500px dari master (tanpa internet)
```

## Kenapa kaca terlihat seperti kaca

Tiga hal, dan ketiganya harus ada:

1. **Ada yang dipantulkan.** `backdrop-filter` di atas latar putih datar
   menghasilkan… putih. Karena itu halaman ini punya `.ground-mesh`: empat
   bidang warna sangat muda yang diam di belakang. Ini satu-satunya alasan
   latarnya tidak lagi putih polos.
2. **Blur + saturasi, bukan cuma transparansi.** `blur(24px) saturate(180%)`.
   Transparansi saja cuma memudarkan; saturasi yang membuat warna di baliknya
   terlihat "hidup" seperti kaca asli.
3. **Garis cahaya di tepi atas.** `inset 0 1px 0` putih di tepi atas meniru
   pantulan cahaya pada kepingan kaca — detail kecil yang membedakan "kotak
   tembus pandang" dari "kaca".

Kaca dipakai **hanya di 3–7 permukaan besar yang diam**: header, bar filter
katalog, panel pembelian, catatan editorial, footer, drawer, dan menu mobile.
Sengaja **tidak** dipasang di 12 kartu produk — itu akan berarti 12 wilayah
blur yang dihitung ulang setiap frame scroll, dan justru itu biaya yang mahal.

## Gerak (motion)

Memakai [`motion`](https://motion.dev) (dulu Framer Motion). Dua aturan:

**Hanya `transform` dan `opacity` yang dianimasikan.** Keduanya dikerjakan
kompositor, jadi halaman tetap 60fps walau banyak elemen bergerak.
`scripts/verify.mjs` memeriksa ini secara otomatis: hasil terakhir
`offCompositor: 0` dari 5 animasi yang berjalan.

**Jarak tempuhnya kecil.** 12–20px, bukan 60px. Rasa "halus" datang dari
kurva easing (`cubic-bezier(0.32, 0.72, 0, 1)` — kurva yang dipakai Apple),
bukan dari jarak yang jauh.

Yang dianimasikan:

| Bagian | Gerak |
|---|---|
| Header | Menguncup saat scroll: padding mengecil, radius 20px → 999px |
| Menu mobile | Sheet kaca turun dengan scrim yang memudar |
| Drawer keranjang | Panel meluncur dari kanan, barisnya `layout` saat dihapus |
| Bar filter katalog | Pil kategori terpilih **meluncur** antar opsi (`layoutId`) |
| Grid produk | Muncul bertahap (`stagger`) saat masuk viewport |
| Kartu produk | Naik 4px + gambar membesar 1.05 saat hover |
| Panel hero | Bilah keterangan kaca dengan kilau melintas (`glass-sheen`) |
| Halaman | Cross-fade pendek saat pindah rute |

Semua ini dimatikan otomatis lewat `<MotionConfig reducedMotion="user">` di
`main.jsx` — satu tempat, bukan cek media query di tiap komponen.

## Rating, stok, dan chat admin

Fitur ini diminta dengan satu skenario yang sangat spesifik: **barang sudah habis,
tapi admin lupa memperbarui stok.** Pembeli melihat "Tersedia", memesan, lalu
kecewa. Skenario kedua yang disebut adalah pembeli yang ingin bertanya lebih
dahulu sebelum membeli.

Skenario pertama itu yang menentukan seluruh desainnya, bukan skenario kedua.

### Stok membawa umur pembacaannya

`data/stock.js` tidak menyimpan angka saja, melainkan angka **dan** kapan terakhir
dicek:

```js
'jaket-twill': { qty: 2, checkedDaysAgo: 5 },
'sling-bag':   { qty: 0, checkedDaysAgo: 6 },
```

Umur itu muncul di tiga tempat — label stok, baris peringatan di panel pembelian,
dan baris stok di dalam chat. Angka yang tidak bisa dipercaya tidak boleh
ditampilkan sebagai fakta; "Sisa 2, dicek 5 hari lalu" jujur, "Sisa 2" saja tidak.

Dua barang sengaja dibuat sebagai kasus menarik, dan keduanya berlawanan arah:

| Barang | Tercatat | Umur | Artinya |
|---|---|---|---|
| `jaket-twill` | Sisa 2 | 5 hari | Mungkin sudah habis |
| `sling-bag` | Habis | 6 hari | Mungkin sudah masuk lagi |

Yang kedua itu cerminan skenario aslinya. Kalau chat hanya bisa bilang "habis",
ia tidak menambah apa pun — pembeli sudah tahu dari halaman. Karena itu jawaban
untuk kasus ini menyebut "bisa saja sudah masuk lagi tanpa tercatat".

### Jawaban stok dihasilkan, bukan ditulis

`data/chat.js` tidak menyimpan kalimat jawaban stok. Ia memanggil `stockFor()`
yang sama dengan yang dipakai label di halaman, lalu menyusun kalimat dari hasilnya.
Ini keputusan yang paling menentukan, dan alasannya sederhana: **dua tempat yang
menjawab pertanyaan sama dari dua sumber berbeda pasti akan berbeda suatu hari.**
Kalau jawabannya ditulis tangan, mengubah `jaket-twill` jadi 20 unit akan membuat
halaman bilang "Tersedia" sementara chat masih bilang "Sisa 2" — persis kelas bug
yang fitur ini ada untuk mencegah.

`verify-produk.mjs` menguji tepat ini, dan menamainya apa adanya:
`agreesWithBadge`. Untuk kasus yang habis, jawabannya **wajib** memuat kata
"habis"; untuk yang tersedia, "tersedia" atau "sisa".

Pengarah niat (`intentFromText`) juga sengaja berurutan dari yang paling khusus:
`ukuran` → `kirim` → `restock` → `stok` → `lain`. Satu pertanyaan bisa cocok
dengan beberapa pola, dan yang lebih sempit hampir selalu yang benar-benar
ditanyakan. Versi pertama memakai kata `ada` sebagai pemicu niat stok — kata itu
terlalu sering muncul sebagai pelengkap dalam bahasa Indonesia, dan
"bahannya apa **dan ada** ukuran L?" malah dijawab dengan info stok.

### Asistennya mengaku bukan manusia

Header panel menulis **"Balasan otomatis · bukan admin manusia"**, dan itu tetap
terlihat, bukan disembunyikan. Percakapan yang berpura-pura ada manusia di ujung
lain adalah hal yang berbeda dari antarmuka yang menjelaskan dirinya. Sama
alasannya, jeda balasan 600 ms dipakai sebagai konvensi UI yang pembaca pahami —
bukan untuk menipu.

### Rating: satu sumber untuk skor dan daftar

Kesalahan yang sama sempat terjadi di sini: skor dihitung dari `REVIEWS` statis
sementara daftarnya menampilkan ulasan sesi. Menulis ulasan 5 bintang lalu melihat
rata-rata tetap 4,3 adalah bug yang sudah pernah muncul di proyek ini sebelumnya —
persis pola "dua tempat menghitung dari dua sumber". Perbaikannya `ReviewsContext`:
`summarize()` dibuat murni atas sebuah daftar, dan skor maupun daftar membacanya
dari sana. Setelah perbaikan, menulis satu ulasan 5 bintang menaikkan 4,3 → 4,4,
dan `verify-ulasan.mjs` memeriksa kenaikan itu (`averageWentUp`).

Bintang digambar sebagai **dua baris bertumpuk** — satu outline, satu terisi —
dengan baris terisi dipotong `clip-path: inset(0 X% 0 0)`. Satu baris tidak bisa
menunjukkan 4,7; memotong gambar bisa. Yang diuji bukan "apakah bintangnya ada",
melainkan apakah kotak baris terisi **tepat sama** dengan baris di bawahnya —
kalau tidak, potongannya meleset dari bentuk bintangnya.

Semua ini **tidak disimpan** (`localStorage`). Ulasan dan percakapan hilang saat
reload, dan formnya mengatakan itu terus-terang: *"Ulasan ini hanya tersimpan di
halaman ini — demo tanpa server."*

## Keputusan desain lain

**Satu warna aksen.** Paletnya tetap monokrom; hanya label diskon yang
berwarna. Barang dagangan satu-satunya yang boleh berwarna.

**Hierarki dari kontras skala.** Headline hero `clamp(2.5rem, 7vw, 5.5rem)`
berdampingan dengan label 11px ber-tracking `0.14em`. Jarak 8× antara dua
ukuran teks itu yang membuat tata letak terasa dirancang.

**Foto, bukan ilustrasi SVG.** Versi pertama menggambar dua belas produk
sebagai SVG monoline: nol permintaan gambar, tetap tajam di ukuran apa pun,
dan dua belas objek terlihat seperti satu keluarga. Itu bagus untuk *tampilan*,
tapi salah untuk *toko* — pembeli tidak bisa menilai bahan dari gambar garis,
dan toko yang janjinya "kami pilih karena bahannya bagus" harus menunjukkan
bahannya. Ilustrasi SVG sudah dihapus seluruhnya.

Tiga hal yang membuat foto tidak merusak tata letak:

1. **Rasio 4:5 yang sama untuk dua belas foto.** Semuanya 1000×1250, jadi
   tidak ada yang melar atau berletterbox di grid.
2. **Satu atau dua ukuran per foto.** Kalau ada, `srcset` berisi 500px dan
   1000px dan browser memilih sesuai lebar viewport serta kepadatan layar.
   Kalau versi 500px belum ada, foto tetap tampil memakai master 1000px —
   `ProductPhoto` hanya memancarkan `srcset` ketika **kedua** berkas ada,
   karena `srcset` dengan satu entri `undefined` lebih buruk daripada tidak
   ada sama sekali. Lihat "Ukuran kecil" di bawah.
3. **`width`/`height` selalu ditulis.** Kotak sudah menahan ruangnya, tapi ini
   juga membuat browser tahu ukuran intrinsik sebelum file tiba. Tidak ada
   pergeseran tata letak (CLS) — dan di halaman yang isinya memang grid, itu
   yang paling terasa.

Foto **diimpor sebagai modul**, bukan ditaruh di `public/`. Vite lalu
memancarkannya dengan path **relatif**; aset di `public/` akan dipancarkan
sebagai `/produk/...` yang menunjuk ke akar drive saat dibuka dari flashdisk.
Ini alasan yang sama dengan `base: './'` di `vite.config.js` — tanpa keduanya,
janji "bisa dibuka tanpa server" di atas tidak berlaku.

Kartu keranjang menyimpan **id** produk, bukan URL fotonya. URL yang tersimpan
di `localStorage` akan jadi path basi setelah build berikutnya (nama file
di-hash), dan keranjang yang tersimpan akan menampilkan gambar rusak. Id
selamat dari rebuild; nama file yang di-hash tidak.

### Dua ukuran, dan cara menambahkannya

Foto dipanggil lewat `import.meta.glob`, jadi pasangan `nama.jpg` +
`nama-sm.jpg` dicari otomatis: tambahkan berkas `-sm` dan ia langsung dipakai
tanpa mengubah satu baris pun di `catalog.js`. Menghapusnya juga aman — produk
turun ke master, bukan gagal build.

Keduanya sudah ada: 12 master 1000×1250 (~1.6 MB) dan 12 versi 500×625
(~490 kB). Kalau perlu dibuat ulang, ada dua jalan:

```bash
node scripts/fetch-sm.mjs              # unduh 500×625 dari Unsplash
```

```powershell
powershell -File scripts/make-sm.ps1   # turunkan dari master (tanpa internet)
```

Keduanya idempoten — berkas yang sudah ada dilewati, jadi aman dijalankan
ulang. `make-sm.ps1` memakai `System.Drawing` bawaan Windows dan menurunkan
dari master, sehingga potongannya **dijamin identik** dengan berkas besar;
`fetch-sm.mjs` mengambil ulang dari sumber. Pilih `fetch-sm.mjs` kalau master
diragukan, `make-sm.ps1` kalau ingin hasil yang pasti sama persis.

Setelah dijalankan, build ulang — `import.meta.glob` akan menemukan berkas baru
dan `srcset` langsung aktif tanpa mengubah `catalog.js`.

**`sizes` harus cocok dengan tata letaknya.** Grid katalog adalah 2 / 3 / 4
kolom mengikuti viewport, jadi satu kartu lebarnya ~50vw / ~31vw / ~25vw —
karena itu `sizes` punya tiga tingkat, bukan satu. Ini bukan detail: `sizes`
yang salah **lebih buruk daripada tidak punya `srcset` sama sekali**, karena
browser lalu mengasumsikan 100vw dan selalu mengambil berkas terbesar. Kalau
grid-nya diubah, `sizes` di `ProductPhoto.jsx` ikut diubah.

**Radius, bukan garis.** Versi pertama memakai sudut 2px dan border 1px di
mana-mana — itu yang membuat halaman terasa "flat" dan tanpa identitas. Sudut
kini 12–32px, dan bayangan berlapis (tiga lapis, opasitas rendah, bertinta
hangat) menggantikan garis sebagai pemisah kedalaman.

## Satu jebakan yang perlu diketahui

Semua kelas komponen di `index.css` ada di dalam `@layer components`. Itu
bukan kerapian — itu yang membuatnya benar.

Tailwind v4 menaruh utility-nya di `@layer utilities`. Aturan CSS **tanpa**
layer selalu menang atas aturan yang berlayer, tidak peduli seberapa spesifik
selector-nya. Jadi `.field { width: 100% }` yang ditulis tanpa layer akan
diam-diam mengalahkan `sm:w-56` di elemen yang sama. Keduanya deklarasi yang
valid, jadi tidak ada error — kotak pencarian cuma jadi selebar satu baris
dan tidak ada yang sadar.

Ini sempat terjadi di pass ini (`.tile` juga menimpa `rounded-[18px]`). Kalau
menambah kelas komponen baru, taruh di dalam layer itu.

## Yang sengaja tidak dipakai

Tidak ada Three.js, GSAP, atau Lenis. Untuk toko, satu pustaka gerak sudah
cukup — menambah yang kedua hanya menggandakan beban tanpa menambah kesan.

## Verifikasi

```bash
npx vite preview --port 4174          # di terminal lain
node --experimental-websocket scripts/verify.mjs
node --experimental-websocket scripts/verify.mjs --mobile
node --experimental-websocket scripts/verify-produk.mjs
node --experimental-websocket scripts/verify-produk.mjs --mobile
node --experimental-websocket scripts/verify-ulasan.mjs
node --experimental-websocket scripts/verify-geometri.mjs
node --experimental-websocket scripts/verify-geometri.mjs --mobile
node --experimental-websocket scripts/perf.mjs
node --experimental-websocket scripts/shoot.mjs      # tulis PNG ke shots/
node --experimental-websocket scripts/dump-teks.mjs  # cetak teks ter-render
node --experimental-websocket scripts/portable.mjs   # uji klaim file://
```

`verify.mjs` menjalankan seluruh rute, menguji filter/pencarian/urut harga,
menambah–mengubah–menghapus isi keranjang, memeriksa persistensi setelah
reload, menguji header menguncup saat scroll, lalu mengaudit tata letak
(overflow horizontal, teks terpotong, ukuran target klik), aksesibilitas
(landmark, urutan heading, label form), lapisan kaca (apakah
`backdrop-filter` benar-benar terpasang), **foto** (apakah semua benar-benar
termuat, punya `alt`, dan punya `width`/`height`), **pergeseran tata letak**
(CLS diukur setelah reload sungguhan, bukan setelah halaman tenang), dan
memastikan tidak ada animasi yang jalan di main thread.

Pemeriksaan foto itu bukan formalitas. Foto adalah satu-satunya hal di halaman
ini yang bisa gagal dengan cara yang tidak terlihat oleh kode: `naturalWidth`
0 berarti kotak kosong di grid, dan `alt` kosong pada foto produk berarti
pembaca layar melewatinya seolah dekorasi. Keduanya dicek angkanya, bukan
dilihat sekilas.

Hasil terakhir: **0 error, 0 peringatan** di desktop 1440 dan mobile 390;
`clipped: []`, `offscreen: []`, `offCompositor: 0`, `hiddenElements: 0`,
CLS `0` (good). Urutan heading `H1,H2,H2,H3,H3,H3,H3` di halaman produk, di mana
blok ulasan menambah H2 kedua tanpa melompati tingkat.

Satu catatan yang belum diperbaiki: di katalog urutannya `H1,H3×11` — nama tiap
kartu produk adalah H3 langsung di bawah H1, jadi tingkat H2 dilewati. Ini bukan
dari fitur ini (kartunya sudah begitu sejak awal) dan pembaca layar tetap
membacanya, tapi urutan yang benar adalah H1 → H2 untuk bagian, lalu H3 untuk
kartu di dalamnya.

`verify-produk.mjs` menguji halaman produk saja, dan menegaskan hal-hal yang
bisa salah tanpa terlihat: bahwa `clip-path` bintang cocok dengan angka yang
tercetak, bahwa chat terbuka dan membalas, bahwa `<body>` terkunci saat panel
terbuka lalu terbuka lagi saat ditutup, dan yang paling penting
**`agreesWithBadge`** — jawaban stok di chat tidak boleh berbeda dari label di
halaman. Hasil terakhir di kedua viewport: `agreesWithBadge: true`,
`labelledAutomatic: true`, `bodyLocked: true`, `bodyUnlocked: true`, 0 error.

`verify-ulasan.mjs` menjalankan jalur yang hanya bisa diperiksa dengan
menggerakkan halaman: menulis ulasan (dan memastikan tombol kirim tetap mati
sampai **rating dan teks** keduanya ada — `disabledEmpty: true`,
`disabledAfterRatingOnly: true`, `enabledWithBothFields: true`), lalu menanyakan
stok untuk kedua kasus basi. Hasil terakhir: `averageWentUp: true` (4,3 → 4,4),
`saysOut: true` + `admitsMayHaveChanged: true` untuk `sling-bag`,
`offersToHold: true` + `admitsStale: true` untuk `jaket-twill`, dan teks bebas
"bahannya apa dan ada ukuran L?" dijawab bahan **dan** ukuran, bukan stok.

### Kenapa ada `verify-geometri.mjs`

Screenshot kembali sebagai data piksel yang tidak bisa dibaca sebagai gambar di
konteks ini — jadi tata letak tidak dinilai dengan melihat, melainkan dengan
mengukur. Yang diukur adalah kegagalan yang justru tidak terlihat di DOM yang
"lulus": apakah baris bintang terisi **tepat menimpa** baris outline di bawahnya
(`starRowsAligned`), apakah ada blok di panel pembelian yang **saling tumpang
tindih** (`overlaps: []`), apakah panel chat **berubah tinggi** setelah pesan
masuk (`panelStable`) — bug klasik sheet dengan daftar panjang yang mendorong
composer keluar — dan apakah ada target klik di bawah 24px.

Hasil terakhir, desktop 1440 dan mobile 390: `overlaps: []`,
`starRowsAligned: true` (kedua baris 70×14 di kedua viewport), `panelStable: true`,
`composerInsidePanel: true`, `submitFullyVisible: true`, `panelFitsViewport: true`,
`small: []`. Tombol "Tanya admin" setinggi 50px di keduanya.

`shoot.mjs` tetap ada untuk manusia yang mau melihat sendiri — ia menulis 6 PNG
per viewport ke `shots/` (halaman produk, blok ulasan, form ulasan, chat, chat
berbalas, dan kasus habis). `dump-teks.mjs` mencetak teks yang benar-benar
ter-render beserta daftar elemen yang teksnya terpotong — itu cara memeriksa copy
tanpa membaca gambar.

### Biaya kaca (diukur, bukan dikira-kira)

`perf.mjs` mengukur frame time saat scroll di halaman terberat (katalog:
bar kaca sticky + 12 kartu):

| | Desktop 1440 | Mobile 390 |
|---|---|---|
| Median frame | 7.0 ms | 6.9 ms |
| p95 | 13.9 ms | 7.0 ms |
| Frame terburuk | 14.0 ms | 14.1 ms |
| Frame > 16.7 ms | **0** | **0** |
| Long task (>50ms) | 0 | 0 |
| Heap JS | 4.0 MB | 3.8 MB |

Angka ini **sesudah** foto dipasang, dan hasilnya lebih baik daripada sebelum
foto dipasang (yang masih punya 1 frame di atas anggaran). Nol frame melewati
anggaran 16.7 ms di kedua viewport, tidak ada long task, dan `willChange`
tetap 0 elemen.

`backdropPanels` tetap **3** setelah panel chat ditambahkan. Itu memang
hasil yang diharapkan: panel chat hanya ada di DOM saat dibuka, jadi ia tidak
masuk anggaran kaca statis — dan kalau ia pernah masuk, angkanya akan naik dan
itu tanda bahwa `backdrop-filter`-nya terpasang di tempat yang salah.

### Kenapa harus ada dua ukuran foto

Ini bukan optimisasi teoretis — versi pertama, dengan hanya berkas 1000px,
punya regresi nyata yang terukur: di mobile frame di atas anggaran **8–10**
(dari ~142 frame) dan p95 **20.8 ms**. Penyebabnya bukan kaca (`backdropPanels`
tetap 3, `willChange` tetap 0) melainkan decode 12 JPEG ~1 MP.

Setelah versi 500px terpasang: p95 **20.8 → 7.0 ms**, frame di atas anggaran
**8–10 → 0**. Regresinya hilang sepenuhnya.

Verifikasi bahwa browser memang memilih yang kecil, bukan sekadar berharap:
`verify.mjs` sekarang melaporkan `currentSrc` tiap gambar. Di viewport 390,
**11 dari 12 gambar memilih berkas 500px** (`choseSmall: 11`). Di desktop
1422 juga 11 dari 12.

Satu yang tersisa — `kaos`, kartu pertama — tetap memilih 1000px di kedua
viewport. Itu bukan bug `sizes` (tiga gambar `eager` lain memilih yang kecil):
Chrome punya heuristik yang menaikkan prioritas gambar pertama, dan karena
gambar itu juga kandidat LCP, mengambilnya lebih besar adalah keputusan yang
masuk akal. Efeknya satu berkas besar, bukan dua belas.

**Catatan cara mengukur.** Run pertama di mesin yang sama sempat menunjukkan
angka jauh lebih buruk (desktop p95 20.9, terburuk 83.4, 13 frame di atas
anggaran). Itu biaya decode dengan cache kosong, bukan biaya scroll — run
berikutnya 0–1 frame. Kalau mengukur ulang, buang run pertama dan jangan
mengutipnya.

`naturalWidth` yang dilaporkan terlihat kecil (195 px di mobile) — itu benar,
bukan bug: spesifikasi `srcset` membagi lebar intrinsik dengan densitas, jadi
berkas 500w di slot 195 CSS px pada DPR 2 memang melaporkan 195. Yang
menentukan pilihan adalah `currentSrc`, bukan `naturalWidth`.

Catatan penting: ini hanya berlaku karena kaca dipasang di **3 panel besar
yang diam** di halaman katalog. Kalau `backdrop-filter` dipasang di 12 kartu
produk, angkanya akan jauh berbeda — biayanya sebanding dengan luas area yang
di-blur, bukan jumlah panel.

Angka di tabel atas sudah termasuk foto — lihat catatan regresi mobile di
bawah tabel untuk biayanya.

Catatan: `node --experimental-websocket` diperlukan di Node 20 karena skrip
ini memakai WebSocket bawaan untuk bicara ke Chrome DevTools Protocol.

## Kontras warna

Teks duduk di atas mesh, jadi angka yang penting adalah **kasus terburuk** —
titik tergelap mesh (`#f2f1ed`), bukan rasio di atas putih murni. Warna yang
hanya lolos di atas putih berarti belum lolos.

| Token | vs `#ffffff` | vs `#f2f1ed` | WCAG |
|---|---|---|---|
| `--color-ink` #141413 | 18.44:1 | 15.38:1 | AAA |
| `--color-muted` #5c5c56 | 6.66:1 | 5.56:1 | AA |
| `--color-faint` #6d6d67 | 5.21:1 | 4.35:1 | AA di atas putih |
| `--color-sale` #a8442a | 6.02:1 | 5.02:1 | AA |

`--color-faint` adalah yang paling rawan: ia dipakai untuk teks 12px (harga
coret, tombol "Hapus", catatan kaki). Versi pertama file ini memakai `#87877f`
yang hanya **3.62:1** — gagal AA, dan tidak ketahuan sampai rasio dihitung
ulang untuk pass ini. `#6d6d67` adalah abu-abu paling terang yang masih lolos.
**Jangan dicerahkan lagi tanpa menghitung ulang terhadap mesh.**

## Bundle

| | Ukuran |
|---|---|
| CSS | 7.4 kB gzip |
| JS | 128.0 kB gzip |
| Foto (12 × 2 ukuran) | ~2.1 MB total di disk |

JS naik dari ~85 kB karena `motion` menambah ~36 kB — pertukaran yang
disengaja, ini keputusan estetika, bukan keputusan performa. Fitur rating, stok,
dan chat menambah ~7 kB lagi; tidak ada pustaka baru, hanya komponen dan data.
Data ulasan dan stok ikut ke dalam bundle karena keduanya statis — itu wajar
untuk demo, tapi di toko sungguhan keduanya datang dari server, dan justru
karena itu `stockFor()` dan `summarize()` ditulis sebagai fungsi murni: yang
perlu diubah hanya dari mana datanya datang, bukan cara membacanya.

Foto adalah biaya terbesar, dan itu wajar: inilah barang yang dijual. Yang
penting bukan total di disk melainkan **apa yang benar-benar diunduh satu
halaman**. Grid katalog memuat 12 kartu, tapi browser mengambil satu ukuran per
kartu sesuai viewport — dan terukur, di mobile ia memilih berkas 500px untuk 11
dari 12 kartu. Baris pertama `eager`, sisanya `lazy`, jadi foto di bawah
lipatan tidak diambil sampai di-scroll.

Perkiraan yang diunduh saat membuka katalog di mobile: 12 × ~35 kB ≈ **420 kB**
(11 berkas 500px + 1 master 1000px), bukan 1.6 MB kalau semua master yang
terambil.

## Catatan

Ini situs demo untuk keperluan akademik. Tidak ada backend: tombol "Lanjut ke
pembayaran" belum terhubung ke payment gateway, dan data produk ada di
`src/data/catalog.js` sebagai data statis.

Begitu juga stok, ulasan, dan chat. Stok ada di `src/data/stock.js` sebagai
angka tetap dengan umur tetap, dan chat menjawab dari pola kalimat, bukan dari
model bahasa. Yang **bukan** tiruan hanyalah konsistensinya: karena label stok
di halaman dan jawaban stok di chat membaca dari `stockFor()` yang sama, keduanya
tidak bisa saling bertentangan — dan di toko sungguhan, sifat itu tetap benar
walau `stockFor()` berubah membaca dari API.
