import { createApp } from './app.js'
import { env } from './config/env.js'
import { connectDb } from './db/connect.js'
import { startRemindersJob } from './jobs/reminders.js'
import { logger } from './lib/logger.js'
import './models/User.js'
import { createClientMount } from './vite.js'

async function main() {
  await connectDb(env.MONGODB_URI)
  const app = createApp({ mountClient: await createClientMount() })
  // node-cron jobs; never in tests (they call runReminders directly)
  if (env.NODE_ENV !== 'test') startRemindersJob()
  app.listen(env.PORT, () => logger.info(`Fundora running on ${env.APP_URL} (port ${env.PORT})`))
}

main().catch((err) => {
  logger.fatal({ err }, 'startup failed')
  process.exit(1)
})
