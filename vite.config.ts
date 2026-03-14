import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    hmr: {
      overlay: false,
    },
  },
  build: {
    chunkSizeWarningLimit: 450,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('scheduler')) {
              return 'vendor-react'
            }
            if (id.includes('@dnd-kit')) {
              return 'vendor-dnd'
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons'
            }
            return 'vendor'
          }
          return undefined
        },
      },
    },
  },
})
