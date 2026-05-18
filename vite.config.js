import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // En desarrollo, /api se redirige al Worker en producción (KV real).
  server: {
    proxy: {
      '/api': {
        target: 'https://manager.prado-mx.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
