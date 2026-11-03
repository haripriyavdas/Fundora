import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// Root is the project folder; index.html loads src/client/main.tsx.
// In dev, Express runs this config as middleware (src/server/vite.ts).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': r('./src/client'),
      '@shared': r('./src/shared'),
    },
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
})
