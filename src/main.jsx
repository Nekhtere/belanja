import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import App from './App'
import { CartProvider } from './store/CartContext'
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
        <ReviewsProvider>
          <App />
        </ReviewsProvider>
      </CartProvider>
    </MotionConfig>
  </StrictMode>
)
