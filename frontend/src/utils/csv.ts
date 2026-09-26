function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

/** Joins rows into an Excel-friendly CSV string (UTF-8 BOM + quoted cells). */
export function rowsToCsv(rows: (string | number)[][]): string {
  return `﻿${rows.map((row) => row.map(csvCell).join(',')).join('\n')}`
}

/**
 * Builds a download name such as "役员报酬_每月支付明细_600万円_20260926.pdf": the parts joined by
 * "_", with whitespace and the characters no operating system accepts in a file name removed.
 */
export function buildFilename(parts: string[], extension: string): string {
  const clean = (part: string) => part.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, '')
  return `${parts.map(clean).filter(Boolean).join('_')}.${extension}`
}

/** Triggers a browser download of the given file content. */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Triggers a browser download of the given CSV content. */
export function downloadCsv(filename: string, content: string): void {
  downloadBlob(filename, new Blob([content], { type: 'text/csv;charset=utf-8' }))
}

export interface PayslipRow { label: string; value: number }

/**
 * One 給与明細 table, in the same shape the on-screen table uses (支給 / 控除 side by side,
 * a subtotal row, a net-pay row). Shared by the CSV and PDF exports so both always
 * describe exactly what the panel shows.
 */
export interface PayslipData {
  title: string
  headers: [string, string, string, string]
  payments: PayslipRow[]
  deductions: PayslipRow[]
  totalPaymentLabel: string
  totalPayment: number
  totalDeductionLabel: string
  totalDeduction: number
  netPayLabel: string
  netPay: number
}

/** Mirrors the on-screen 給与明細 table as a CSV (raw yen integers, spreadsheet friendly). */
export function payslipToCsv(data: PayslipData): string {
  const rowCount = Math.max(data.payments.length, data.deductions.length)
  const body: (string | number)[][] = Array.from({ length: rowCount }, (_, i) => [
    data.payments[i]?.label ?? '', data.payments[i]?.value ?? '',
    data.deductions[i]?.label ?? '', data.deductions[i]?.value ?? '',
  ])
  return rowsToCsv([
    data.headers,
    ...body,
    [data.totalPaymentLabel, data.totalPayment, data.totalDeductionLabel, data.totalDeduction],
    [data.netPayLabel, '', '', data.netPay],
  ])
}
