import type { TakkenUploadRecord } from '@/types/takken'

const REQUIRED_HEADERS = ['学習日', '出典', '正誤', '分野', '細目']

async function readCsvText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
  if (!utf8.includes('�')) return utf8
  return new TextDecoder('shift-jis', { fatal: false }).decode(buffer)
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current)
  return cells
}

function extractHyperlinkLabel(raw: string): { label: string; url: string | null } {
  const match = raw.match(/HYPERLINK\("([^"]*)"\s*,\s*"([^"]*)"\)/)
  if (match) return { url: match[1] ?? null, label: match[2] ?? raw }
  return { label: raw.trim(), url: null }
}

export class TakkenCsvParseError extends Error {}

export function parseTakkenCsv(text: string): TakkenUploadRecord[] {
  const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim().length > 0)
  if (lines.length < 2) throw new TakkenCsvParseError('文件内容为空或缺少表头。')

  const headerLine = lines[0]
  if (!headerLine) throw new TakkenCsvParseError('文件内容为空或缺少表头。')
  const headers = parseCsvLine(headerLine).map((header) => header.trim())
  const missing = REQUIRED_HEADERS.filter((required) => !headers.includes(required))
  if (missing.length > 0) throw new TakkenCsvParseError(`缺少必要的列：${missing.join('、')}`)

  const columnIndex = (name: string) => headers.indexOf(name)
  const dateIndex = columnIndex('学習日')
  const sourceIndex = columnIndex('出典')
  const resultIndex = columnIndex('正誤')
  const categoryIndex = columnIndex('分野')
  const subItemIndex = columnIndex('細目')

  const records: TakkenUploadRecord[] = []
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line)
    const resultRaw = (cells[resultIndex] ?? '').trim()
    if (resultRaw !== '○' && resultRaw !== '×') continue
    const { label, url } = extractHyperlinkLabel((cells[sourceIndex] ?? '').trim())
    const categoryRaw = (cells[categoryIndex] ?? '').trim()
    const subItemRaw = (cells[subItemIndex] ?? '').trim()
    if (!categoryRaw || !subItemRaw) continue
    records.push({
      date: (cells[dateIndex] ?? '').trim(),
      label,
      url,
      correct: resultRaw === '○',
      categoryRaw,
      subItemRaw,
    })
  }

  if (records.length === 0) throw new TakkenCsvParseError('没有解析到有效的作答记录。')
  return records
}

export async function parseTakkenCsvFile(file: File): Promise<TakkenUploadRecord[]> {
  const text = await readCsvText(file)
  return parseTakkenCsv(text)
}
