// npm run validate-schemes                 → every file in data/schemes (skips names starting with _)
// npm run validate-schemes -- <file> ...   → only these files (a named _ file is checked too)
import { checkSchemeFiles, findSchemeFiles, printIssues } from './lib/schemeFiles.js'

const args = process.argv.slice(2)
const paths = args.length > 0 ? args : findSchemeFiles()
const result = checkSchemeFiles(paths)

printIssues(result)
const failed = new Set(result.errors.map((e) => e.file)).size
console.log(
  `${paths.length} file(s) checked: ${paths.length - failed} valid, ` +
    `${result.errors.length} error(s), ${result.warnings.length} warning(s)`,
)
process.exit(result.errors.length > 0 ? 1 : 0)
