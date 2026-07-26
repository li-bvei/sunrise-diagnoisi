import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const officialSource = await readFile(
  resolve(root, 'frontend/src/data/universities/officialUniversities.ts'),
  'utf8',
)
const aliasesSource = await readFile(
  resolve(root, 'frontend/src/data/universities/universityAliases.ts'),
  'utf8',
)

const records = [...officialSource.matchAll(
  /id: "([^"]+)",\s+countryCode: "([^"]+)",\s+officialName: "([^"]+)"/g,
)].map((match) => ({
  id: match[1],
  countryCode: match[2],
  officialName: match[3],
}))

const untranslated = records.filter(
  ({ id }) => !aliasesSource.includes(`universityId: '${id}'`),
)

async function translate(officialName) {
  const url = new URL('https://translate.googleapis.com/translate_a/single')
  url.searchParams.set('client', 'gtx')
  url.searchParams.set('sl', 'en')
  url.searchParams.set('tl', 'zh-CN')
  url.searchParams.set('dt', 't')
  url.searchParams.set('q', officialName)

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const payload = await response.json()
      const translated = payload?.[0]
        ?.map((segment) => segment?.[0] ?? '')
        .join('')
        .trim()
      if (!translated) throw new Error('Empty translation')
      return translated
    } catch (error) {
      if (attempt === 4) throw error
      await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 500))
    }
  }
  throw new Error('Translation failed')
}

const translated = []
for (const [index, record] of untranslated.entries()) {
  const zh = await translate(record.officialName)
  translated.push({ ...record, zh })
  process.stdout.write(`${index + 1}/${untranslated.length} ${record.id}: ${zh}\n`)
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 80))
}

const generatedAt = new Date().toISOString().slice(0, 10)
const lines = [
  '/* Generated machine translations. Official matching always uses the stable ID and officialName. */',
  '',
  "export type MachineTranslatedUniversityName = {",
  '  universityId: string',
  '  zh: string',
  "  translationStatus: 'machine-translated'",
  '  translatedAt: string',
  '}',
  '',
  'export const machineTranslatedUniversityNames: MachineTranslatedUniversityName[] = [',
  ...translated.map(({ id, zh }) => (
    `  { universityId: ${JSON.stringify(id)}, zh: ${JSON.stringify(zh)}, translationStatus: 'machine-translated', translatedAt: '${generatedAt}' },`
  )),
  ']',
  '',
  'export const machineTranslatedUniversityNameCount = machineTranslatedUniversityNames.length',
  '',
]

await writeFile(
  resolve(root, 'frontend/src/data/universities/machineTranslatedNames.ts'),
  lines.join('\n'),
  'utf8',
)
