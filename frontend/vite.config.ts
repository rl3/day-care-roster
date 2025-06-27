import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react()
    // VitePWA Plugin deaktiviert - wir verwenden unseren eigenen Service Worker
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: false  // Kein Browser-Auto-Open in Docker
  },
  build: {
    outDir: 'dist',
    assetsDir: 'static',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', '@tanstack/react-query'],
          utils: ['date-fns', 'axios']
        }
      }
    }
  },
  base: '/'
})