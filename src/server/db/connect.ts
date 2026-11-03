import mongoose from 'mongoose'
import { logger } from '../lib/logger.js'

mongoose.set('strictQuery', true)

export async function connectDb(uri: string) {
  await mongoose.connect(uri)
  // Make sure every model's indexes exist (unique email etc.)
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()))
  logger.info('MongoDB connected')
}

export const dbIsUp = () => mongoose.connection.readyState === 1
