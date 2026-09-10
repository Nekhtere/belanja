import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative asset paths. Without this, index.html points at /assets/... and
  // /favicon.svg, which resolve to the drive root when the build is opened
  // straight off a flashdisk — the bundle never loads and the page is blank.
  // Relative paths are also what makes imported images work from file://.
  base: './',
  build: {
    // React is the only runtime dependency, so the whole app should stay
    // well under the default warning threshold.
    chunkSizeWarningLimit: 600,
  },
})
