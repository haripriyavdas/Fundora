import { Router } from 'express'
import { dbIsUp } from '../db/connect.js'

export const healthRouter = Router()

// Used by Render and UptimeRobot
healthRouter.get('/', (_req, res) => {
  const up = dbIsUp()
  res.status(up ? 200 : 503).json({ ok: up, db: up ? 'up' : 'down' })
})
