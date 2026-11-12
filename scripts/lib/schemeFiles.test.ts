import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { checkSchemeFiles, findSchemeFiles, todayInIndia } from './schemeFiles.js'

const example = JSON.parse(readFileSync('data/schemes/_example.json', 'utf8')) as Record<
  string,
  unknown
>
let dir: string

/** Writes a scheme file into the temp folder and returns its path. */
function write(path: string, content: unknown) {
  const full = join(dir, path)
  mkdirSync(join(full, '..'), { recursive: true })
  writeFileSync(full, typeof content === 'string' ? content : JSON.stringify(content))
  return full
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'fundora-schemes-'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('findSchemeFiles', () => {
  it('finds json files in subfolders and skips names starting with _ or .', () => {
    write('central/a.json', {})
    write('karnataka/b.json', {})
    write('_example.json', {})
    write('central/.gitkeep', '')
    write('_drafts/c.json', {})
    write('central/readme.md', '')
    const found = findSchemeFiles(dir).map((p) =>
      p.replaceAll('\\', '/').split('/').slice(-2).join('/'),
    )
    expect(found).toEqual(['central/a.json', 'karnataka/b.json'])
  })
})

describe('checkSchemeFiles', () => {
  const today = '2026-11-09'
  const valid = (id: string) => ({
    ...example,
    id,
    verifiedOn: '2026-11-01',
    closesOn: '2026-12-31',
  })

  it('passes a valid file with no warnings', () => {
    const result = checkSchemeFiles([write('private/good.json', valid('good'))], today)
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.schemes.map((s) => s.scheme.id)).toEqual(['good'])
  })

  it('reports broken JSON and schema problems with the field path', () => {
    const result = checkSchemeFiles(
      [
        write('private/broken.json', '{ "id": '),
        write('private/bad.json', { ...valid('bad'), aidType: 'gift' }),
      ],
      today,
    )
    expect(result.errors.map((e) => e.message)).toEqual([
      expect.stringContaining('not valid JSON'),
      expect.stringMatching(/^aidType: /),
    ])
  })

  it('needs the id to match the file name', () => {
    const result = checkSchemeFiles([write('private/file-name.json', valid('other-id'))], today)
    expect(result.errors[0].message).toContain('must match the file name')
  })

  it('lets a "_" format-reference file keep any id', () => {
    const result = checkSchemeFiles([write('_example.json', valid('example-scheme'))], today)
    expect(result.errors).toEqual([])
  })

  it('rejects the same id in two folders', () => {
    const result = checkSchemeFiles(
      [write('central/same.json', valid('same')), write('private/same.json', valid('same'))],
      today,
    )
    expect(result.errors[0].message).toContain('also used by')
  })

  it('warns, without failing, about an old verifiedOn or a closing date that has passed', () => {
    const result = checkSchemeFiles(
      [
        write('private/old.json', {
          ...valid('old'),
          verifiedOn: '2026-08-01',
          closesOn: '2026-10-31',
        }),
      ],
      today,
    )
    expect(result.errors).toEqual([])
    expect(result.warnings.map((w) => w.message)).toEqual([
      expect.stringContaining('over 90 days old'),
      expect.stringContaining('has passed'),
    ])
  })

  it('rejects a verifiedOn date in the future', () => {
    const result = checkSchemeFiles(
      [write('private/f.json', { ...valid('f'), verifiedOn: '2026-12-01' })],
      today,
    )
    expect(result.errors[0].message).toContain('in the future')
  })
})

describe('todayInIndia', () => {
  it('rolls over at midnight in India, not UTC', () => {
    expect(todayInIndia(new Date('2026-11-08T18:29:00Z'))).toBe('2026-11-08')
    expect(todayInIndia(new Date('2026-11-08T18:31:00Z'))).toBe('2026-11-09')
  })
})
