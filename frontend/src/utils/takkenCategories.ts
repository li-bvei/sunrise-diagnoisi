export const TAKKEN_CATEGORY_ORDER = ['权利关系', '法令上的限制', '税に関する法令', '宅地建物取引业法等', '5问免除科目'] as const

export type TakkenCategory = (typeof TAKKEN_CATEGORY_ORDER)[number] | '其他'

// 宅建考试官方固定结构：50题选择题，科目题数分布多年稳定不变。
export const TAKKEN_EXAM_TOTAL_QUESTIONS = 50
export const TAKKEN_CATEGORY_WEIGHTS: Record<Exclude<TakkenCategory, '其他'>, number> = {
  '权利关系': 14,
  '法令上的限制': 8,
  '税に関する法令': 3,
  '宅地建物取引业法等': 20,
  '5问免除科目': 5,
}

const CATEGORY_KEYWORDS: [Exclude<TakkenCategory, '其他'>, string[]][] = [
  ['权利关系', ['权利关系', '民法', '借地借家法', '区分所有法', '不动产登记法']],
  ['法令上的限制', ['法令上的限制', '国土利用计画法', '都市计画法', '建筑基准法', '盛土规制法', '土地区画整理法', '农地法']],
  ['税に関する法令', ['税に関する法令', '印纸税', '不动产取得税', '价格评定', '不动产鑑定评价基准', '地价公示法']],
  ['宅地建物取引业法等', ['宅地建物取引业法', '宅建业法', '住宅瑕疵担保履行法']],
  ['5问免除科目', ['5问免除', '住宅金融支援机构', '景品表示法', '公正竞争规约', '统计', '需给动向', '土地', '建物']],
]

export function classifyTakkenTag(tag: string): TakkenCategory {
  const prefix = tag.split('・')[0]
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (prefix === category) return category
    if (keywords.some((keyword) => tag.includes(keyword))) return category
  }
  return '其他'
}

export function takkenTagLabel(tag: string): string {
  const parts = tag.split('・')
  return parts.length > 1 ? parts.slice(1).join('・') : tag
}
