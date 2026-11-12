// npm run check-scheme -- data/schemes/central/<id>.json [--today YYYY-MM-DD]
// Validates the file, then runs it against the made-up sample students and prints a table, so a
// reviewer can see the rules behave as the official eligibility text says.
import { evaluate } from '../src/shared/eligibility/evaluate.js'
import { SAMPLE_PROFILES } from '../src/shared/eligibility/fixtures/profiles.js'
import { checkSchemeFiles, printIssues, todayInIndia } from './lib/schemeFiles.js'

const args = process.argv.slice(2)
const todayAt = args.indexOf('--today')
const today = todayAt >= 0 ? args[todayAt + 1] : todayInIndia()
const paths = args.filter((arg, i) => !arg.startsWith('--') && (todayAt < 0 || i !== todayAt + 1))

if (paths.length === 0 || !today || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
  console.error('Usage: npm run check-scheme -- <scheme file> [--today YYYY-MM-DD]')
  process.exit(1)
}

const result = checkSchemeFiles(paths, today)
printIssues(result)
if (result.errors.length > 0) process.exit(1)

for (const { file, scheme } of result.schemes) {
  console.log(`\n${scheme.name}  (${file}, today ${today})`)
  console.log('Rules:')
  for (const reason of evaluate({}, scheme, today).reasons) console.log(`  - ${reason.rule}`)
  console.table(
    Object.entries(SAMPLE_PROFILES).map(([profile, fields]) => {
      const { state, score, reason } = evaluate(fields, scheme, today)
      return { profile, state, score, reason }
    }),
  )
}
console.log('Sample students are in src/shared/eligibility/fixtures/profiles.ts.')
