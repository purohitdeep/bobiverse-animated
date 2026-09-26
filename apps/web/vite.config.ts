import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The spatial view is intentionally lazy-loaded. Keep its WebGL dependency in
// a separately budgeted chunk so the reader shell and directory remain small.
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
