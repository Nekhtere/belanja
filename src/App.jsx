import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Header from './components/Header'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import Home from './pages/Home'
import Catalog from './pages/Catalog'
import Product from './pages/Product'
import Cart from './pages/Cart'
import Payment from './pages/Payment'
import { useRoute, matchRoute, navigate } from './lib/router'
import { useDocumentTitle } from './hooks/useDocumentTitle'
import { pageTransition } from './lib/motion'

function NotFound() {
  useDocumentTitle('Halaman tidak ditemukan — RUPA')
  return (
    <div className="wrap flex flex-col items-center justify-center gap-4 py-32 text-center">
      <p className="type-label">404</p>
      <h1 className="type-h2">Halaman tidak ditemukan</h1>
      <p className="max-w-sm text-[0.875rem] type-muted">
        Alamat yang Anda buka tidak ada. Mungkin salah ketik, atau halamannya sudah dipindahkan.
      </p>
      <button type="button" onClick={() => navigate('/')} className="btn btn-ink mt-2">
        Kembali ke beranda
      </button>
    </div>
  )
}

export default function App() {
  const path = useRoute()
  const route = matchRoute(path)
  const [cartOpen, setCartOpen] = useState(false)

  return (
    <div className="relative flex min-h-dvh flex-col">
      {/* The mesh is what the glass panels blur. Fixed, static, painted once —
          see .ground-mesh in index.css for why it is not animated. */}
      <div className="ground-mesh" aria-hidden="true" />

      <div className="relative z-10 flex min-h-dvh flex-col">
        <Header
          onOpenCart={() => setCartOpen(true)}
          onNavigate={() => setCartOpen(false)}
          route={path}
        />

        <main id="main" className="flex-1">
          {/* mode="wait" so the outgoing page finishes leaving before the next
              one arrives — with "sync" both are mounted at once and the scroll
              position jumps.

              The transition key is the page IDENTITY, not the raw path. Keying
              it on the path would replay the whole-page fade every time you
              tapped a different category pill (same page, different query) —
              and would remount Catalog, which is exactly what stops the
              selected-pill element from sliding between options. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={route.key}
              initial={pageTransition.initial}
              animate={pageTransition.animate}
              exit={pageTransition.exit}
            >
              {/* Only the product page is keyed on its param: moving between
                  two products must reset the size/colour selection, and it is
                  a genuinely different page. Catalog keeps its state so the
                  filters survive a category switch. */}
              {route.name === 'home' && <Home />}
              {route.name === 'catalog' && <Catalog kategori={route.params.kategori} />}
              {route.name === 'product' && <Product key={route.params.id} id={route.params.id} />}
              {route.name === 'cart' && <Cart />}
              {route.name === 'payment' && <Payment />}
              {route.name === 'notfound' && <NotFound />}
            </motion.div>
          </AnimatePresence>
        </main>

        <Footer />
      </div>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  )
}
