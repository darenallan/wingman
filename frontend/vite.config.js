import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // En dev, redirige /api vers le backend Express local (en prod, même domaine)
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
