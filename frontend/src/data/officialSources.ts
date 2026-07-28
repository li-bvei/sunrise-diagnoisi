export interface OfficialRequirementLink {
  id: string
  title: { zh: string; ja: string }
  description?: { zh: string; ja: string }
  url: string
  sourceType: 'page' | 'pdf'
  effectiveDate?: string
  verifiedAt: string
}

const verifiedAt = '2026-07-27'

export const officialSources = {
  highlySkilled: {
    id: 'highly-skilled',
    title: { zh: '高度人才积分制度总入口', ja: '高度人材ポイント制総合案内' },
    url: 'https://www.moj.go.jp/isa/applications/resources/newimmiact_3_evaluate_index.html',
    sourceType: 'page',
    verifiedAt,
  },
  pointEvidence: {
    id: 'point-evidence',
    title: { zh: '积分项目证明资料基本示例', ja: 'ポイント項目の立証資料・基本例' },
    url: 'https://www.moj.go.jp/isa/content/001419077.pdf',
    sourceType: 'pdf',
    verifiedAt,
  },
  research: {
    id: 'research',
    title: { zh: '研究成果积分与证明要求', ja: '研究実績のポイント・立証要件' },
    url: 'https://www.moj.go.jp/isa/content/001419077.pdf',
    sourceType: 'pdf',
    verifiedAt,
  },
  japaneseQualification: {
    id: 'japanese-qualification',
    title: { zh: '日本国家资格积分与证明要求', ja: '日本の国家資格のポイント・立証要件' },
    url: 'https://www.moj.go.jp/isa/content/001419077.pdf',
    sourceType: 'pdf',
    verifiedAt,
  },
  innovation: {
    id: 'innovation',
    title: { zh: '创新促进支援措施官方入口', ja: 'イノベーション促進支援措置・公式入口' },
    description: { zh: '独立PDF地址可能随名单更新，使用入管厅积分制度页中的当前名单入口。', ja: '一覧更新でPDF URLが変わる可能性があるため、入管庁ポイント制度ページの現行一覧入口を使用します。' },
    url: 'https://www.moj.go.jp/isa/applications/resources/newimmiact_3_evaluate_index.html',
    sourceType: 'page',
    effectiveDate: '2026-03',
    verifiedAt,
  },
  growthField: {
    id: 'growth-field',
    title: { zh: '指定成长领域尖端事业名单', ja: '指定成長分野の先端的な事業一覧' },
    url: 'https://www.moj.go.jp/isa/content/001458719.pdf',
    sourceType: 'pdf',
    effectiveDate: '2026-03',
    verifiedAt,
  },
  localGovernment: {
    id: 'local-government',
    title: { zh: '地方公共团体支援措施官方页面', ja: '地方公共団体の支援措置・公式ページ' },
    url: 'https://www.moj.go.jp/isa/applications/resources/03_00068.html',
    sourceType: 'page',
    verifiedAt,
  },
  foreignQualification: {
    id: 'foreign-qualification',
    title: { zh: '指定外国资格・表彰名单', ja: '指定外国資格・表彰等一覧' },
    url: 'https://www.moj.go.jp/isa/content/930001661.pdf',
    sourceType: 'pdf',
    effectiveDate: '2023-12',
    verifiedAt,
  },
  japaneseLanguage: {
    id: 'japanese-language',
    title: { zh: '入管厅认可的日语能力范围', ja: '入管庁が認める日本語能力一覧' },
    url: 'https://www.moj.go.jp/isa/content/930001656.pdf',
    sourceType: 'pdf',
    verifiedAt,
  },
  university: {
    id: 'university',
    title: { zh: '大学加分官方参考名单', ja: '大学加点の公式参考一覧' },
    url: 'https://www.moj.go.jp/isa/content/001335478.pdf',
    sourceType: 'pdf',
    effectiveDate: '2026-01',
    verifiedAt,
  },
  jSkip: {
    id: 'j-skip',
    title: { zh: '特别高度人才J-Skip官方页面', ja: '特別高度人材J-Skip公式ページ' },
    url: 'https://www.moj.go.jp/isa/applications/resources/nyuukokukanri01_00009.html',
    sourceType: 'page',
    verifiedAt,
  },
  permanentResidence: {
    id: 'permanent-residence',
    title: { zh: '永住许可申请官方页面', ja: '永住許可申請・公式ページ' },
    url: 'https://www.moj.go.jp/isa/applications/procedures/16-4.html',
    sourceType: 'page',
    verifiedAt,
  },
  permanentResidenceGuideline: {
    id: 'permanent-residence-guideline',
    title: { zh: '永住许可相关指南（令和8年2月24日修订）', ja: '永住許可に関するガイドライン（令和８年２月２４日改訂）' },
    url: 'https://www.moj.go.jp/isa/applications/resources/nyukan_nyukan50.html',
    sourceType: 'page',
    effectiveDate: '2026-02',
    verifiedAt,
  },
  permanentResidenceHighlySkilled: {
    id: 'permanent-residence-highly-skilled',
    title: { zh: '高度人才永住在留年限缓和措施', ja: '高度人材の永住許可に関する在留期間の緩和' },
    url: 'https://www.moj.go.jp/isa/applications/procedures/nyuukokukanri07_00131.html',
    sourceType: 'page',
    verifiedAt,
  },
} satisfies Record<string, OfficialRequirementLink>
