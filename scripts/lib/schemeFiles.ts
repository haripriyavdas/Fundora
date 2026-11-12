import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import { SchemeFileSchema, type SchemeFile } from '../../src/shared/schemas/scheme.js'

export const SCHEMES_DIR = 'data/schemes'

/** Warn when a scheme hasn't been checked against its source for this long. */
const STALE_AFTER_DAYS = 90

export type Issue = { file: string; message: string }
export type CheckResult = {
  schemes: { file: string; scheme: SchemeFile }[]
  errors: Issue[]
  warnings: Issue[]
}

/** Today's date in India as YYYY-MM-DD, so deadlines don't flip at 5:30 am. */
export function todayInIndia(now = new Date()): string {
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function daysBefore(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

/** Every .json file under the folder, skipping names that start with "_" or ".". */
export function findSchemeFiles(dir = SCHEMES_DIR): string[] {
  const files: string[] = []
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith('_') || name.startsWith('.')) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) files.push(...findSchemeFiles(path))
    else if (name.endsWith('.json')) files.push(path)
  }
  return files
}

/**
 * Parses and validates scheme files: the schema, id = file name, ids unique across files.
 * Old `verifiedOn` and past `closesOn` are warnings, not errors.
 */
export function checkSchemeFiles(paths: string[], today = todayInIndia()): CheckResult {
  const result: CheckResult = { schemes: [], errors: [], warnings: [] }
  const seen = new Map<string, string>()
  const staleBefore = daysBefore(today, STALE_AFTER_DAYS)

  for (const path of paths) {
    const file = relative('.', path).replaceAll('\\', '/')
    const error = (message: string) => result.errors.push({ file, message })
    const warn = (message: string) => result.warnings.push({ file, message })

    let json: unknown
    try {
      json = JSON.parse(readFileSync(path, 'utf8'))
    } catch (err) {
      error(`not valid JSON: ${(err as Error).message}`)
      continue
    }

    const parsed = SchemeFileSchema.safeParse(json)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        error(`${issue.path.join('.') || '(file)'}: ${issue.message}`)
      }
      continue
    }

    const scheme = parsed.data
    const expected = basename(path, '.json')
    // "_" files are format references that are never seeded, so their id can be anything
    if (!expected.startsWith('_') && scheme.id !== expected) {
      error(`id "${scheme.id}" must match the file name "${expected}"`)
    }
    const other = seen.get(scheme.id)
    if (other) error(`id "${scheme.id}" is also used by ${other}`)
    else seen.set(scheme.id, file)

    if (scheme.verifiedOn > today) error(`verifiedOn ${scheme.verifiedOn} is in the future`)
    else if (scheme.verifiedOn < staleBefore) {
      warn(
        `verifiedOn ${scheme.verifiedOn} is over ${STALE_AFTER_DAYS} days old; re-check the source`,
      )
    }
    if (scheme.closesOn && scheme.closesOn < today) {
      warn(`closesOn ${scheme.closesOn} has passed; update the dates for the next cycle`)
    }

    result.schemes.push({ file, scheme })
  }
  return result
}

export function printIssues({ errors, warnings }: Pick<CheckResult, 'errors' | 'warnings'>) {
  for (const { file, message } of warnings) console.warn(`warning  ${file}  ${message}`)
  for (const { file, message } of errors) console.error(`error    ${file}  ${message}`)
}
