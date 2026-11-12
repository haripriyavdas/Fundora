// Turns one row of the shared Google Sheet (exported as CSV) into a scheme file object.
// Column names are the JSON field names, with two exceptions: `portalName` + `portalUrl` become
// `portal`, and an optional `folder` column says where the file goes.

/** Short codes, one per line or comma-separated: "engineering, computer-it". */
const CODE_LIST_COLUMNS = ['courses', 'states', 'groups']
/** Sentences, one per line in the cell (Alt+Enter in Sheets), since they contain commas. */
const TEXT_LIST_COLUMNS = ['benefits', 'eligibilityText', 'notes']
const NUMBER_COLUMNS = ['amountMax']
/** Structured fields are pasted as JSON, in the same shape as the file. */
const JSON_COLUMNS = [
  'rules',
  'renewal',
  'documents',
  'steps',
  'offline',
  'officialDocuments',
  'importantDates',
  'helpline',
]
const TEXT_COLUMNS = [
  'id',
  'name',
  'provider',
  'providerType',
  'aidType',
  'level',
  'amount',
  'opensOn',
  'closesOn',
  'mode',
  'sourceUrl',
  'verifiedOn',
  'about',
]

export const SHEET_COLUMNS = [
  ...TEXT_COLUMNS,
  ...CODE_LIST_COLUMNS,
  ...TEXT_LIST_COLUMNS,
  ...NUMBER_COLUMNS,
  ...JSON_COLUMNS,
  'portalName',
  'portalUrl',
  'folder',
]

/** Default folder per provider type. State schemes need a `folder` column unless they're Karnataka-only. */
const FOLDERS: Record<string, string> = { central: 'central', private: 'private', bank: 'private' }
const STATE_FOLDERS: Record<string, string> = { KA: 'karnataka' }

export type SheetRowResult =
  { ok: true; folder: string; scheme: Record<string, unknown> } | { ok: false; errors: string[] }

export function sheetRowToScheme(row: Record<string, string>): SheetRowResult {
  const errors: string[] = []
  const scheme: Record<string, unknown> = {}
  const cell = (column: string) => row[column]?.trim() ?? ''

  for (const column of Object.keys(row)) {
    if (!SHEET_COLUMNS.includes(column)) errors.push(`unknown column "${column}"`)
  }

  for (const column of TEXT_COLUMNS) {
    if (cell(column)) scheme[column] = cell(column)
  }
  // closesOn "null" (or "open all year") means the scheme never closes
  if (/^(null|open all year)$/i.test(cell('closesOn'))) scheme.closesOn = null

  const split = (column: string, separator: RegExp) =>
    cell(column)
      .split(separator)
      .map((s) => s.trim())
      .filter(Boolean)
  for (const column of CODE_LIST_COLUMNS) if (cell(column)) scheme[column] = split(column, /[,\n]/)
  for (const column of TEXT_LIST_COLUMNS) if (cell(column)) scheme[column] = split(column, /\n/)

  for (const column of NUMBER_COLUMNS) {
    if (!cell(column)) continue
    const number = Number(cell(column).replaceAll(',', ''))
    if (Number.isFinite(number)) scheme[column] = number
    else errors.push(`${column}: "${cell(column)}" is not a number`)
  }

  for (const column of JSON_COLUMNS) {
    if (!cell(column)) continue
    try {
      scheme[column] = JSON.parse(cell(column))
    } catch {
      errors.push(`${column}: not valid JSON`)
    }
  }

  if (cell('portalName') || cell('portalUrl')) {
    scheme.portal = { name: cell('portalName'), url: cell('portalUrl') }
  }

  const states = scheme.states as string[] | undefined
  const folder =
    cell('folder') ||
    FOLDERS[cell('providerType')] ||
    (states?.length === 1 ? STATE_FOLDERS[states[0]] : undefined)
  if (!folder)
    errors.push('add a "folder" column (for example "maharashtra") for this state scheme')
  else if (!/^[a-z-]+$/.test(folder)) errors.push(`folder "${folder}" must be lowercase letters`)
  if (!scheme.id) errors.push('id is empty')

  return errors.length > 0 ? { ok: false, errors } : { ok: true, folder: folder!, scheme }
}
