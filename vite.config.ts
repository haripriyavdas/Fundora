import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// Root is frontend-fundora-starter/ (index.html loads main.tsx); .env stays in the project folder.
// In dev, Express runs this config as middleware (src/server/vite.ts).
export default defineConfig({
  root: r('./frontend-fundora-starter'),
  envDir: r('.'),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': r('./frontend-fundora-starter'),
      '@shared': r('./src/shared'),
    },
  },
  build: {
    outDir: r('./dist/client'),
    emptyOutDir: true,
  },
})
