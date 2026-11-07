const DAY_MS = 24 * 60 * 60 * 1000

function utcDate(value: string): Date {
  const [year = 1970, month = 1, day = 1] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function nthWeekday(year: number, month: number, weekday: number, nth: number): string {
  const first = new Date(Date.UTC(year, month - 1, 1))
  const offset = (weekday - first.getUTCDay() + 7) % 7
  return dateKey(new Date(Date.UTC(year, month - 1, 1 + offset + (nth - 1) * 7)))
}

function vernalEquinoxDay(year: number): number {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4))
}

function autumnalEquinoxDay(year: number): number {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4))
}

function baseJapaneseHolidays(year: number): Set<string> {
  const base = new Set([
    `${year}-01-01`, nthWeekday(year, 1, 1, 2), `${year}-02-11`,
    ...(year >= 2020 ? [`${year}-02-23`] : []),
    `${year}-${String(3).padStart(2, '0')}-${String(vernalEquinoxDay(year)).padStart(2, '0')}`,
    `${year}-04-29`, `${year}-05-03`, `${year}-05-04`, `${year}-05-05`,
    ...(year === 2020 ? [`${year}-07-23`] : year === 2021 ? [`${year}-07-22`] : year >= 2003 ? [nthWeekday(year, 7, 1, 3)] : [`${year}-07-20`]),
    ...(year === 2020 ? [`${year}-08-10`] : year === 2021 ? [`${year}-08-08`] : year >= 2016 ? [`${year}-08-11`] : []),
    nthWeekday(year, 9, 1, 3),
    `${year}-${String(9).padStart(2, '0')}-${String(autumnalEquinoxDay(year)).padStart(2, '0')}`,
    ...(year === 2020 ? [`${year}-07-24`] : year === 2021 ? [`${year}-07-23`] : [nthWeekday(year, 10, 1, 2)]),
    `${year}-11-03`, `${year}-11-23`,
  ])
  if (year === 2019) {
    base.add('2019-04-30').add('2019-05-01').add('2019-05-02').add('2019-10-22')
  }

  // National holidays falling between two national holidays are also public holidays.
  const yearLength = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / DAY_MS
  for (let day = 2; day < yearLength; day += 1) {
    const key = dateKey(new Date(Date.UTC(year, 0, day)))
    const date = utcDate(key)
    const prev = dateKey(new Date(date.getTime() - DAY_MS))
    const next = dateKey(new Date(date.getTime() + DAY_MS))
    if (base.has(prev) && base.has(next)) base.add(key)
  }

  // A Sunday national holiday is transferred to the next non-holiday weekday.
  for (const holiday of [...base]) {
    const date = utcDate(holiday)
    if (date.getUTCDay() !== 0) continue
    let substitute = new Date(date.getTime() + DAY_MS)
    while (base.has(dateKey(substitute))) substitute = new Date(substitute.getTime() + DAY_MS)
    base.add(dateKey(substitute))
  }
  return base
}

const holidayCache = new Map<number, Set<string>>()

export function japanesePublicHolidaysAround(year: number): Set<string> {
  const dates = new Set<string>()
  for (let candidate = year - 1; candidate <= year + 1; candidate += 1) {
    let holidays = holidayCache.get(candidate)
    if (!holidays) {
      holidays = baseJapaneseHolidays(candidate)
      holidayCache.set(candidate, holidays)
    }
    holidays.forEach((date) => dates.add(date))
  }
  return dates
}

export function isJapanesePublicHoliday(date: string): boolean {
  const year = utcDate(date).getUTCFullYear()
  return japanesePublicHolidaysAround(year).has(date)
}

export function addCalendarDays(start: string, amount: number): string {
  const date = utcDate(start)
  date.setUTCDate(date.getUTCDate() + amount)
  return dateKey(date)
}

export function calendarDayDifference(start: string, end: string): number {
  return Math.round((utcDate(end).getTime() - utcDate(start).getTime()) / DAY_MS)
}

export function countJapaneseBusinessDays(start: string, end: string): number {
  const startDate = utcDate(start)
  const endDate = utcDate(end)
  const direction = startDate <= endDate ? 1 : -1
  const from = direction === 1 ? startDate : endDate
  const to = direction === 1 ? endDate : startDate
  const holidays = new Set<string>()
  for (let year = from.getUTCFullYear(); year <= to.getUTCFullYear(); year += 1) {
    japanesePublicHolidaysAround(year).forEach((holiday) => holidays.add(holiday))
  }
  let count = 0
  for (let day = from.getTime(); day <= to.getTime(); day += DAY_MS) {
    const date = new Date(day)
    const weekday = date.getUTCDay()
    if (weekday !== 0 && weekday !== 6 && !holidays.has(dateKey(date))) count += 1
  }
  return count
}

export function addJapaneseBusinessDays(start: string, amount: number): string {
  if (!amount) return start
  const direction = amount > 0 ? 1 : -1
  let remaining = Math.abs(amount)
  let cursor = start
  while (remaining > 0) {
    cursor = addCalendarDays(cursor, direction)
    if (countJapaneseBusinessDays(cursor, cursor) === 1) remaining -= 1
  }
  return cursor
}
