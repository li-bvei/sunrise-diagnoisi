import type {
  RentalCostItemKey,
  RentalCostReport,
  RentalCostReportLineItem,
  RentalCostReportMaterial,
  RentalMaterialKey,
} from '@/types/rentalCost'

export const RENTAL_COST_RULES_VERSION = '2026-08'

const ITEM_TEXT: Record<RentalCostItemKey, { label: [string, string]; description: [string, string] }> = {
  deposit: {
    label: ['敷金', '敷金'],
    description: ['退租时会视房屋损耗情况扣除清洁修缮费用，剩余部分退还。', '退去時に原状回復費用等を差し引いたうえで、残額が返還されます。'],
  },
  keyMoney: {
    label: ['礼金', '礼金'],
    description: ['支付给房东的谢礼，通常不予退还。', '貸主へのお礼金であり、通常は返還されません。'],
  },
  guaranteeDeposit: {
    label: ['保证金', '保証金'],
    description: ['作为租赁保证金支付给房东，退租时按合同约定结算。', '賃貸借の保証金として貸主に支払い、退去時に契約内容に基づき精算されます。'],
  },
  agencyFee: {
    label: ['仲介手续费', '仲介手数料'],
    description: ['支付给仲介公司的居间服务费用。', '仲介会社への仲介サービス費用です。'],
  },
  guaranteeCompanyFee: {
    label: ['保证公司利用料（初期费用）', '保証会社利用料（初期費用）'],
    description: ['首次签约时支付给保证公司的初期费用，后续可能产生更新费用。', '契約時に保証会社へ支払う初期費用です。以降、更新料が発生する場合があります。'],
  },
  fireInsurance: {
    label: ['火灾保险', '火災保険'],
    description: ['通常为2年期的火灾及财物损害保险费用。', '通常2年契約の火災保険・家財保険の保険料です。'],
  },
  keyReplacement: {
    label: ['钥匙更换费', '鍵交換費'],
    description: ['入住前更换门锁钥匙的费用。', '入居前に玄関の鍵を交換する費用です。'],
  },
  currentMonthRent: {
    label: ['当月房租', '当月賃料'],
    description: ['入住当月按实际天数折算的房租，可参考日割参考值后调整为实际金额。', '入居当月分の賃料（日割り）です。参考の日割り額をもとに実際の金額に調整してください。'],
  },
  nextMonthRent: {
    label: ['次月房租', '翌月賃料'],
    description: ['部分房源要求提前支付次月整月房租。', '物件によっては翌月分の賃料を前払いする場合があります。'],
  },
  currentMonthManagementFee: {
    label: ['当月管理费/共益费', '当月管理費・共益費'],
    description: ['当月按天折算的公共设施维护及管理费用。', '当月分の共用部分維持管理費用（日割り）です。'],
  },
  nextMonthManagementFee: {
    label: ['次月管理费/共益费', '翌月管理費・共益費'],
    description: ['部分房源要求提前支付次月整月管理费。', '物件によっては翌月分の管理費・共益費を前払いする場合があります。'],
  },
  cleaningFee: {
    label: ['清扫费', '清掃費'],
    description: ['入住前或退租时的专业清扫费用，视合同约定收取。', '入居前又は退去時のハウスクリーニング費用で、契約内容により発生します。'],
  },
  contractAdminFee: {
    label: ['契约事务手续费', '契約事務手数料'],
    description: ['仲介公司或管理公司收取的合同事务处理费用。', '仲介会社又は管理会社が徴収する契約事務手数料です。'],
  },
}

const MATERIAL_TEXT: Record<RentalMaterialKey, [string, string]> = {
  residenceCard: ['在留卡（或护照）', '在留カード（又はパスポート）'],
  residentCertificate: ['住民票', '住民票'],
  incomeProof: ['收入证明 / 在职证明', '収入証明・在職証明'],
  personalSeal: ['印章', '印鑑'],
  sealCertificate: ['印鉴登录证明书', '印鑑登録証明書'],
  idPhoto: ['证件照', '証明写真'],
  emergencyContact: ['紧急联系人 / 保证人信息', '緊急連絡先・連帯保証人情報'],
  bankAccount: ['银行账户信息（房租自动扣款用）', '銀行口座情報（家賃引落用）'],
}

export function itemLabel(key: RentalCostItemKey, zh: boolean): string {
  return ITEM_TEXT[key].label[zh ? 0 : 1]
}
export function itemDescription(key: RentalCostItemKey, zh: boolean): string {
  return ITEM_TEXT[key].description[zh ? 0 : 1]
}
export function materialLabel(key: RentalMaterialKey, zh: boolean): string {
  return MATERIAL_TEXT[key][zh ? 0 : 1]
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function suggestCurrentMonthRent(monthlyRent: number, moveInDate: string): number {
  const date = new Date(`${moveInDate}T00:00:00`)
  const total = daysInMonth(date.getFullYear(), date.getMonth() + 1)
  const proratedDays = total - date.getDate() + 1
  return Math.round((monthlyRent / total) * proratedDays)
}

export interface BuildRentalCostReportInput {
  monthlyRent: number | null
  moveInDate: string | null
  items: RentalCostReportLineItem[]
  materials: RentalCostReportMaterial[]
  locale: 'zh-CN' | 'ja-JP'
}

export function buildRentalCostReport(input: BuildRentalCostReportInput): RentalCostReport {
  return {
    reportId: `RC-${Date.now().toString(36).toUpperCase()}`,
    generatedAt: new Date().toISOString(),
    locale: input.locale,
    monthlyRent: input.monthlyRent,
    moveInDate: input.moveInDate,
    items: input.items,
    total: input.items.reduce((sum, item) => sum + item.amount, 0),
    materials: input.materials,
  }
}
