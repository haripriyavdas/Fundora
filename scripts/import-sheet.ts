// npm run import-sheet -- schemes.csv [--force]
//
// Converts rows of the shared Google Sheet (File → Download → CSV) into data/schemes/<folder>/<id>.json
// files for review, then validates them. Existing files are left alone unless --force is given.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import Papa from 'papaparse'
import { SchemeFileSchema } from '../src/shared/schemas/scheme.js'
import { checkSchemeFiles, printIssues, SCHEMES_DIR } from './lib/schemeFiles.js'
import { sheetRowToScheme } from './lib/sheetRow.js'

const args = process.argv.slice(2)
const force = args.includes('--force')
const csvPath = args.find((a) => !a.startsWith('--'))
if (!csvPath) {
  console.error('Usage: npm run import-sheet -- <file.csv> [--force]')
  process.exit(1)
}

const csv = Papa.parse<Record<string, string>>(readFileSync(csvPath, 'utf8'), {
  header: true,
  skipEmptyLines: 'greedy',
  transformHeader: (h) => h.trim(),
})
if (csv.errors.length > 0) {
  for (const e of csv.errors) console.error(`row ${(e.row ?? 0) + 2}: ${e.message}`)
  process.exit(1)
}

const written: string[] = []
let failed = 0
let skipped = 0
csv.data.forEach((row, i) => {
  const line = i + 2 // +1 for the header, +1 because sheets count from 1
  const result = sheetRowToScheme(row)
  if (!result.ok) {
    failed++
    for (const message of result.errors) console.error(`row ${line}: ${message}`)
    return
  }
  const dir = join(SCHEMES_DIR, result.folder)
  const path = join(dir, `${String(result.scheme.id)}.json`)
  if (existsSync(path) && !force) {
    skipped++
    console.warn(`row ${line}: ${path} already exists; skipped (use --force to replace it)`)
    return
  }
  // Same key order as the schema and _example.json, so reviews read the same way
  const ordered = Object.fromEntries(
    Object.keys(SchemeFileSchema.shape)
      .filter((key) => key in result.scheme)
      .map((key) => [key, result.scheme[key]]),
  )
  mkdirSync(dir, { recursive: true })
  writeFileSync(path, `${JSON.stringify(ordered, null, 2)}\n`)
  written.push(path)
})

console.log(`${written.length} file(s) written, ${skipped} skipped, ${failed} row(s) with errors`)
if (written.length > 0) {
  console.log('Validating the written files:')
  const check = checkSchemeFiles(written)
  printIssues(check)
  console.log(`${check.schemes.length} valid, ${check.errors.length} error(s)`)
  if (check.errors.length > 0) failed++
}
process.exit(failed > 0 ? 1 : 0)
