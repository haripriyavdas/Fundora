import { resolve } from 'node:path'
import express, { type Express } from 'express'
import { isProd } from './config/env.js'

/**
 * Dev: Vite runs as middleware (hot reload, one port). Prod: serve dist/client and fall back to
 * index.html for any non-API GET so React Router can handle the path.
 */
export async function createClientMount(): Promise<(app: Express) => void> {
  if (!isProd) {
    // Vite is a dev dependency, so it is only imported in development
    const { createServer } = await import('vite')
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' })
    return (app) => {
      app.use(vite.middlewares)
    }
  }

  const clientDir = resolve(process.cwd(), 'dist/client')
  return (app) => {
    app.use(express.static(clientDir, { index: false, maxAge: '1y', immutable: true }))
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache')
      res.sendFile(resolve(clientDir, 'index.html'))
    })
  }
}
