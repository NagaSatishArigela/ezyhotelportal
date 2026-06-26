import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':   ['react', 'react-dom'],
          'vendor-router':  ['@tanstack/react-router'],
          'vendor-query':   ['@tanstack/react-query'],
          'vendor-radix':   [
            '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',   '@radix-ui/react-tooltip',
            '@radix-ui/react-switch', '@radix-ui/react-select',
          ],
          'vendor-form':    ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-ui':      ['lucide-react', 'sonner', 'class-variance-authority'],
        },
      },
    },
    chunkSizeWarningLimit: 300,
  },
})
