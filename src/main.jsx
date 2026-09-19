import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import App from './App'
import { CartProvider } from './store/CartContext'
import { CheckoutProvider } from './store/CheckoutContext'
import { ReviewsProvider } from './store/ReviewsContext'
import './styles/index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* reducedMotion="user" makes Motion honour the OS "reduce motion" setting
        for every animated component at once — transforms and opacity are
        skipped, opacity-only transitions still play. Setting it once here is
        why no component below has to check the media query itself. */}
    <MotionConfig reducedMotion="user">
      <CartProvider>
        {/* CheckoutProvider sits inside CartProvider because the checkout
            reads the cart's lines to compute its totals. */}
        <CheckoutProvider>
          <ReviewsProvider>
            <App />
          </ReviewsProvider>
        </CheckoutProvider>
      </CartProvider>
    </MotionConfig>
  </StrictMode>
)
