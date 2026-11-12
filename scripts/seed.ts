// npm run seed               → validate data/schemes, then upsert into MongoDB
// npm run seed -- --dry-run  → validate and show what would change, without writing
//
// The only code that writes the schemes collection. Needs MONGODB_URI (from the environment or .env).
// Schemes whose file is deleted are marked retired, never deleted.
import { existsSync } from 'node:fs'
import mongoose from 'mongoose'
import { SchemeFileSchema } from '../src/shared/schemas/scheme.js'
import { Scheme } from '../src/server/models/Scheme.js'
import { checkSchemeFiles, findSchemeFiles, printIssues } from './lib/schemeFiles.js'
import { contentHash, planSeed, type ExistingScheme } from './lib/seedPlan.js'

const dryRun = process.argv.includes('--dry-run')

if (!process.env.MONGODB_URI && existsSync('.env')) process.loadEnvFile('.env')
const uri = process.env.MONGODB_URI
if (!uri?.startsWith('mongodb')) {
  console.error('MONGODB_URI is not set. Add it to .env or the environment.')
  process.exit(1)
}

const check = checkSchemeFiles(findSchemeFiles())
printIssues(check)
if (check.errors.length > 0) {
  console.error(`Not seeding: ${check.errors.length} error(s). Run npm run validate-schemes.`)
  process.exit(1)
}

/** Optional keys left out of a file are removed from its document, so deleting a field sticks. */
const ALL_KEYS = Object.keys(SchemeFileSchema.shape)

await mongoose.connect(uri)
try {
  const existing = await Scheme.find({}, { id: 1, status: 1, contentHash: 1, dataVersion: 1 }).lean<
    ExistingScheme[]
  >()
  const schemes = check.schemes.map((s) => s.scheme)
  const plan = planSeed(schemes, existing)

  const db = mongoose.connection.db?.databaseName
  console.log(`${dryRun ? 'Dry run on' : 'Seeding'} database "${db}"`)
  for (const [label, ids] of Object.entries({
    added: plan.added,
    updated: plan.updated,
    retired: plan.retired,
  })) {
    console.log(`  ${label}: ${ids.length}${ids.length > 0 ? `  (${ids.join(', ')})` : ''}`)
  }
  console.log(`  unchanged: ${plan.unchanged.length}`)

  if (dryRun) {
    console.log('Dry run: nothing written.')
  } else if (!plan.changed) {
    console.log(`Nothing changed; dataVersion stays ${plan.dataVersion}.`)
  } else {
    await Scheme.syncIndexes()
    const seededAt = new Date()
    const write = new Set([...plan.added, ...plan.updated])
    const ops = schemes
      .filter((scheme) => write.has(scheme.id))
      .map((scheme) => {
        const missing = ALL_KEYS.filter((key) => !(key in scheme))
        return {
          updateOne: {
            filter: { id: scheme.id },
            update: {
              $set: {
                ...scheme,
                status: 'active',
                dataVersion: plan.dataVersion,
                contentHash: contentHash(scheme),
                seededAt,
              },
              ...(missing.length > 0
                ? { $unset: Object.fromEntries(missing.map((k) => [k, 1])) }
                : {}),
            },
            upsert: true,
          },
        }
      })
    if (ops.length > 0) await Scheme.bulkWrite(ops)
    if (plan.retired.length > 0) {
      await Scheme.updateMany(
        { id: { $in: plan.retired } },
        { $set: { status: 'retired', dataVersion: plan.dataVersion, seededAt } },
      )
    }
    console.log(`Done. dataVersion is now ${plan.dataVersion}.`)
  }
} finally {
  await mongoose.disconnect()
}
