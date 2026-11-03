import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/server/test/env.ts'],
    // mongodb-memory-server needs time to start on the first run
    hookTimeout: 60_000,
    testTimeout: 20_000,
  },
})
