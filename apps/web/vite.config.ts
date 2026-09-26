import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The spatial view is intentionally lazy-loaded. Keep its WebGL dependency in
// a separately budgeted chunk so the reader shell and directory remain small.
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
  },
  // The atlas is served on 6055 everywhere: local dev, preview, and the
  // container all expose the same origin. strictPort fails loudly instead of
  // silently sliding to another port, which would break a shared link.
  server: {
    port: 6055,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 6055,
    strictPort: true,
  },
})
