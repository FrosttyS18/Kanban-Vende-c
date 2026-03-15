import fs from 'node:fs'
import path from 'node:path'

const SOURCE_DIR = path.resolve(process.cwd(), 'src')
const VALID_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.json'])
const MOJIBAKE_PATTERN = /(Ã[\u0080-\u00BFA-Za-z]|ï¿½|â€™|â€œ|â€\u009d|â€“|â€”|Ì|\uFFFD)/u
const IGNORED_FILES = new Set([path.join(SOURCE_DIR, 'utils', 'normalizeMojibake.ts')])

function collectFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath))
      continue
    }

    if (VALID_EXTENSIONS.has(path.extname(entry.name))) {
      if (!IGNORED_FILES.has(fullPath)) {
        files.push(fullPath)
      }
    }
  }

  return files
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, { encoding: 'utf8' })
  const lines = content.split(/\r?\n/u)
  const findings = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (MOJIBAKE_PATTERN.test(line)) {
      findings.push({
        filePath,
        lineNumber: index + 1,
        line: line.trim()
      })
    }
  }

  return findings
}

if (!fs.existsSync(SOURCE_DIR)) {
  console.error(`[encoding:check] Diretório não encontrado: ${SOURCE_DIR}`)
  process.exit(1)
}

const sourceFiles = collectFiles(SOURCE_DIR)
const findings = sourceFiles.flatMap((filePath) => scanFile(filePath))

if (findings.length > 0) {
  console.error('[encoding:check] Mojibake detectado. Corrija antes de continuar.')
  findings.forEach((finding) => {
    console.error(`- ${finding.filePath}:${finding.lineNumber} -> ${finding.line}`)
  })
  process.exit(1)
}

console.log('[encoding:check] OK')
