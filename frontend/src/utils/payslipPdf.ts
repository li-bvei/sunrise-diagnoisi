import type { PayslipData } from '@/utils/csv'
import { downloadBlob } from '@/utils/csv'

export interface PayslipPdfOptions {
  data: PayslipData
  /** Short lines under the title: the inputs this payslip was calculated from, the issue date, … */
  metaLines: string[]
  /** Small print under the table: estimate caveats, disclaimer. */
  footnotes: string[]
  brand: string
  format: (value: number) => string
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/**
 * Builds the off-screen A4-width sheet that gets rasterised into the PDF. Every string goes in
 * through textContent, never parsed as markup, and the table reuses the app's own
 * .payslip-table styles so the PDF looks like the panel on screen.
 */
export function buildPayslipSheet(options: PayslipPdfOptions): HTMLElement {
  const { data, format } = options
  const sheet = el('div', 'payslip-pdf-sheet')

  const head = el('div', 'payslip-pdf-head')
  head.append(el('h1', undefined, data.title), el('span', 'payslip-pdf-brand', options.brand))
  sheet.append(head)

  if (options.metaLines.length) {
    const meta = el('div', 'payslip-pdf-meta')
    for (const line of options.metaLines) meta.append(el('p', undefined, line))
    sheet.append(meta)
  }

  const table = el('table', 'payslip-table')
  const thead = el('thead')
  const headRow = el('tr')
  data.headers.forEach((label, index) => headRow.append(el('th', index % 2 === 1 ? 'amount' : undefined, label)))
  thead.append(headRow)
  table.append(thead)

  const tbody = el('tbody')
  const rowCount = Math.max(data.payments.length, data.deductions.length)
  for (let i = 0; i < rowCount; i += 1) {
    const payment = data.payments[i]
    const deduction = data.deductions[i]
    const row = el('tr')
    row.append(
      el('td', undefined, payment?.label ?? ''),
      el('td', 'amount', payment ? format(payment.value) : ''),
      el('td', undefined, deduction?.label ?? ''),
      el('td', 'amount', deduction ? format(deduction.value) : ''),
    )
    tbody.append(row)
  }
  table.append(tbody)

  const tfoot = el('tfoot')
  const subtotal = el('tr', 'payslip-subtotal')
  subtotal.append(
    el('td', undefined, data.totalPaymentLabel), el('td', 'amount', format(data.totalPayment)),
    el('td', undefined, data.totalDeductionLabel), el('td', 'amount', format(data.totalDeduction)),
  )
  const net = el('tr', 'payslip-net')
  const netLabel = el('td', undefined, data.netPayLabel)
  netLabel.colSpan = 3
  net.append(netLabel, el('td', 'amount', format(data.netPay)))
  tfoot.append(subtotal, net)
  table.append(tfoot)

  const wrap = el('div', 'payslip-wrap')
  wrap.append(table)
  sheet.append(wrap)

  if (options.footnotes.length) {
    const notes = el('div', 'payslip-pdf-notes')
    for (const line of options.footnotes) notes.append(el('p', undefined, line))
    sheet.append(notes)
  }
  return sheet
}

/**
 * Renders the payslip to an A4 PDF. html2canvas and jsPDF are imported on demand, so they are
 * only downloaded when someone actually presses the button (they are ~400 kB together).
 * The page is rasterised rather than drawn with jsPDF's text API on purpose: the payslip is
 * Chinese/Japanese, and drawing text would mean embedding a multi-megabyte CJK font.
 */
export async function buildPayslipPdf(options: PayslipPdfOptions): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  const sheet = buildPayslipSheet(options)
  document.body.append(sheet)
  try {
    const canvas = await html2canvas(sheet, { scale: 2, backgroundColor: '#ffffff', logging: false })
    // compress:true matters — without it jsPDF embeds the PNG as raw pixels (~5 MB for one page).
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
    pdf.setProperties({ title: options.data.title, creator: options.brand })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imageHeight = (canvas.height * pageWidth) / canvas.width
    const image = canvas.toDataURL('image/png')
    // A payslip is short, so this is one page; the loop only guards against a very long one.
    let offset = 0
    do {
      if (offset > 0) pdf.addPage()
      pdf.addImage(image, 'PNG', 0, -offset, pageWidth, imageHeight)
      offset += pageHeight
    } while (offset < imageHeight)
    return pdf.output('blob')
  } finally {
    sheet.remove()
  }
}

export async function downloadPayslipPdf(filename: string, options: PayslipPdfOptions): Promise<void> {
  downloadBlob(filename, await buildPayslipPdf(options))
}
