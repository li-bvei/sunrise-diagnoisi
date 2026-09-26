/** Local calendar date as YYYYMMDD, for file names. */
export function localDateStamp(now: Date = new Date()): string {
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}${month}${day}`
}

/** Local calendar date as YYYY/MM/DD, printed as the issue date on payslips. */
export function issueDate(now: Date = new Date()): string {
  const stamp = localDateStamp(now)
  return `${stamp.slice(0, 4)}/${stamp.slice(4, 6)}/${stamp.slice(6, 8)}`
}
