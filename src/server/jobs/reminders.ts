import cron from 'node-cron'
import { logger } from '../lib/logger.js'
import { runReminders } from '../services/reminders.js'

/** Daily at 08:00 India time. Safe to overlap or repeat: runReminders claims each reminder once. */
export function startRemindersJob() {
  return cron.schedule(
    '0 8 * * *',
    async () => {
      try {
        const counts = await runReminders()
        logger.info(counts, 'reminders job done')
      } catch (err) {
        logger.error({ err }, 'reminders job failed')
      }
    },
    { timezone: 'Asia/Kolkata' },
  )
}
