import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  // Same aliases as vite.config.ts, for client tests
  resolve: {
    alias: {
      '@shared': fromRoot('./src/shared'),
      '@': fromRoot('./src/client'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/server/test/env.ts'],
    // mongodb-memory-server needs time to start on the first run
    hookTimeout: 60_000,
    testTimeout: 20_000,
  },
})
