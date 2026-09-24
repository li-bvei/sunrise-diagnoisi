function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

/** Joins rows into an Excel-friendly CSV string (UTF-8 BOM + quoted cells). */
export function rowsToCsv(rows: (string | number)[][]): string {
  return `﻿${rows.map((row) => row.map(csvCell).join(',')).join('\n')}`
}

/** Triggers a browser download of the given CSV content. */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export interface PayslipCsvRow { label: string; value: number }

/** Mirrors the on-screen 給与明細 table (支給/控除 side by side, subtotal row, net-pay row) as a CSV. */
export function payslipToCsv(
  headers: [string, string, string, string],
  payments: PayslipCsvRow[],
  deductions: PayslipCsvRow[],
  totalPaymentLabel: string, totalPayment: number,
  totalDeductionLabel: string, totalDeduction: number,
  netPayLabel: string, netPay: number,
): string {
  const rowCount = Math.max(payments.length, deductions.length)
  const body: (string | number)[][] = Array.from({ length: rowCount }, (_, i) => [
    payments[i]?.label ?? '', payments[i]?.value ?? '',
    deductions[i]?.label ?? '', deductions[i]?.value ?? '',
  ])
  return rowsToCsv([
    headers,
    ...body,
    [totalPaymentLabel, totalPayment, totalDeductionLabel, totalDeduction],
    [netPayLabel, '', '', netPay],
  ])
}
