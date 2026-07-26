import { officialUniversities } from './officialUniversities'
import { universityAliases } from './universityAliases'
export { universityAliasCount } from './universityAliases'
import { machineTranslatedUniversityNames } from './machineTranslatedNames'
export { machineTranslatedUniversityNameCount } from './machineTranslatedNames'
import type { BonusUniversity } from '@/types/university'

export { countries } from './countries'
export { universityDatasetMetadata } from './metadata'

export interface UniversitySearchMatch {
  university: BonusUniversity
  matchedName: string
  rank: number
}

export interface UniversitySearchResult {
  results: UniversitySearchMatch[]
  total: number
  tooMany: boolean
}

export const universities: BonusUniversity[] = officialUniversities.map((record) => {
  const extra = universityAliases[record.id]
  const machineTranslated = machineTranslatedUniversityNames.find((item) => item.universityId === record.id)
  const chineseDisplayName = extra?.displayNames?.zh ?? machineTranslated?.zh
  return {
    ...record,
    displayNames: {
      zh: chineseDisplayName,
      ja: extra?.displayNames?.ja ?? record.names.ja[0],
      en: extra?.displayNames?.en ?? record.officialName,
    },
    translationStatus: extra?.translationStatus ?? machineTranslated?.translationStatus,
    names: {
      ...record.names,
      zh: [...record.names.zh, ...(chineseDisplayName ? [chineseDisplayName] : []), ...(extra?.aliases?.zh ?? [])],
      ja: [...record.names.ja, ...(extra?.displayNames?.ja ? [extra.displayNames.ja] : []), ...(extra?.aliases?.ja ?? [])],
      en: [...record.names.en, ...(extra?.displayNames?.en ? [extra.displayNames.en] : []), ...(extra?.aliases?.en ?? [])],
      aliases: [...record.names.aliases],
    },
  }
})

export function getUniversityDisplayName(university: BonusUniversity, locale: 'zh-CN' | 'ja-JP') {
  if (locale === 'zh-CN') return university.displayNames?.zh || university.officialName
  return university.displayNames?.ja || university.officialName
}

export function normalizeSchoolName(value: string) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/&/g, ' and ')
    .replace(/^the\s+/, '')
    .replace(/\band\b/g, 'and')
    .replace(/[\s.,'’"`´()（）[\]{}:/\\\-_·・]+/g, '')
}

export function searchUniversityRecords(countryCode: string, query: string, limit = 20): UniversitySearchResult {
  const normalized = normalizeSchoolName(query)
  if (normalized.length < 2) return { results: [], total: 0, tooMany: false }

  const matches = universities
    .filter((item) => countryCode === 'ALL' || item.countryCode === countryCode)
    .flatMap((university) => {
      const names = [
        ...university.names.en,
        ...university.names.zh,
        ...university.names.ja,
        ...university.names.aliases,
      ]
      const candidates = names.map((name) => ({ name, normalized: normalizeSchoolName(name) }))
      const exact = candidates.find(({ normalized: name }) => name === normalized)
      const prefix = candidates.find(({ normalized: name }) => name.startsWith(normalized))
      const partial = candidates.find(({ normalized: name }) => name.includes(normalized))
      const match = exact ?? prefix ?? partial
      if (!match) return []
      return [{ university, matchedName: match.name, rank: exact ? 0 : prefix ? 1 : 2 }]
    })
    .sort((a, b) => a.rank - b.rank || a.university.officialName.localeCompare(b.university.officialName))

  return { results: matches.slice(0, limit), total: matches.length, tooMany: matches.length > limit }
}

export function searchUniversities(countryCode: string, query: string, limit = 20) {
  return searchUniversityRecords(countryCode, query, limit).results.map(({ university }) => university)
}
