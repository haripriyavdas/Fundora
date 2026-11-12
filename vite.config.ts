import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// Root is frontend-fundora-starter/ (index.html loads main.tsx); .env stays in the project folder.
// In dev, Express runs this config as middleware (src/server/vite.ts).
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, r('.'), ''), ...process.env }
  return {
    root: r('./frontend-fundora-starter'),
    envDir: r('.'),
    plugins: [react(), tailwindcss()],
    define: {
      // A Google client ID is public, so the browser can share the server's GOOGLE_CLIENT_ID
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(
        env.VITE_GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID || '',
      ),
    },
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
  }
})
