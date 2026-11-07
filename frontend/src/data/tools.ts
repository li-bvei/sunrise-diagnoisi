import type { CategoryInfo, DiagnosisTool } from '@/types/content'

const categoryMeta: Omit<CategoryInfo, 'count'>[] = [
  { id: 'residence', icon: 'Passport', name: { 'zh-CN': '在留资格', 'ja-JP': '在留資格' }, description: { 'zh-CN': '计算高度人才积分。', 'ja-JP': '高度人材ポイントを計算します。' } },
  { id: 'property', icon: 'House', name: { 'zh-CN': '不动产', 'ja-JP': '不動産' }, description: { 'zh-CN': '整理在日租房的初期费用与材料。', 'ja-JP': '日本での賃貸契約に必要な初期費用と書類を整理します。' } },
  { id: 'income', icon: 'Coin', name: { 'zh-CN': '收入与经营', 'ja-JP': '収入・経営' }, description: { 'zh-CN': '估算工资到手、社会保险与役员报酬方案。', 'ja-JP': '給与手取り、社会保険、役員報酬プランを試算します。' } },
  { id: 'records', icon: 'Suitcase', name: { 'zh-CN': '在日记录', 'ja-JP': '在日記録' }, description: { 'zh-CN': '整理出入境记录并汇总在日天数。', 'ja-JP': '出入国記録を整理し、在日日数を集計します。' } },
  { id: 'exam', icon: 'Reading', name: { 'zh-CN': '资格考试', 'ja-JP': '資格試験' }, description: { 'zh-CN': '日本资格考试的刷题与学习工具。', 'ja-JP': '日本の資格試験対策用の演習・学習ツールです。' } },
  { id: 'daily', icon: 'Calendar', name: { 'zh-CN': '日期工具', 'ja-JP': '日付ツール' }, description: { 'zh-CN': '计算日本工作日、节假日和日期间隔。', 'ja-JP': '日本の営業日・祝日・日付の期間を計算します。' } },
]

export const tools: DiagnosisTool[] = [
  {
    id: 'highly-skilled', category: 'residence', icon: 'Medal', name: { 'zh-CN': '高度人才积分计算', 'ja-JP': '高度人材ポイント計算' },
    description: { 'zh-CN': '计算高度人才积分，比较年收等不同条件下的结果。', 'ja-JP': '高度人材ポイントを計算し、年収などの条件別に比較します。' },
    duration: { 'zh-CN': '约 5 分钟', 'ja-JP': '約5分' }, results: { 'zh-CN': '资格初判、总积分、逐项明细', 'ja-JP': '資格の初期判断、合計点、項目別内訳' }, status: 'available', route: '/tools/highly-skilled', featured: true,
  },
  {
    id: 'rental', category: 'property', icon: 'Key', name: { 'zh-CN': '租房初期费用诊断', 'ja-JP': '賃貸初期費用診断' },
    description: { 'zh-CN': '计算初期费用，整理房源条件并生成可复制给客户的说明。', 'ja-JP': '初期費用を計算し、物件情報とお客様向けの案内文を作成します。' },
    duration: { 'zh-CN': '随时使用', 'ja-JP': 'いつでも利用' }, results: { 'zh-CN': '初期费用合计、房源概要、客户说明文本', 'ja-JP': '初期費用合計、物件概要、お客様向け案内文' }, status: 'available', route: '/tools/rental-cost', featured: true,
  },
  {
    id: 'japan-date', category: 'daily', icon: 'Calendar', name: { 'zh-CN': '日本日期与工作日', 'ja-JP': '日本の日付・営業日計算' },
    description: { 'zh-CN': '计算日期间隔、加减天数，以及日本节假日除外的工作日。', 'ja-JP': '日付の期間、日数の加減、日本の祝日を除いた営業日数を計算します。' },
    duration: { 'zh-CN': '随时使用', 'ja-JP': 'いつでも利用' }, results: { 'zh-CN': '日期间隔、指定天数后的日期、工作日数', 'ja-JP': '日付の期間、指定日数後の日付、営業日数' }, status: 'available', route: '/tools/japan-date',
  },
  {
    id: 'salary', category: 'income', icon: 'Coin', name: { 'zh-CN': '工资、社保与到手金额', 'ja-JP': '給与・社会保険・手取り' },
    description: { 'zh-CN': '估算员工工资到手金额和公司年度用工成本。', 'ja-JP': '従業員の手取り額と会社の年間雇用コストを試算します。' },
    duration: { 'zh-CN': '约 1 分钟', 'ja-JP': '約1分' }, results: { 'zh-CN': '月／年到手、公司成本、保险与税金明细', 'ja-JP': '月額・年額手取り、会社負担、保険・税の内訳' }, status: 'available', route: '/tools/salary',
  },
  {
    id: 'executive-compensation', category: 'income', icon: 'Briefcase', name: { 'zh-CN': '役员报酬', 'ja-JP': '役員報酬' },
    description: { 'zh-CN': '计算役员报酬对应的个人到手与公司负担。', 'ja-JP': '役員報酬に対する手取り額と会社負担を計算します。' },
    duration: { 'zh-CN': '约 1 分钟', 'ja-JP': '約1分' }, results: { 'zh-CN': '月工资、月度/年度支付明细', 'ja-JP': '月額報酬、月次・年次の支払内訳' }, status: 'available', route: '/tools/executive-compensation',
  },
  {
    id: 'stay-days', category: 'records', icon: 'Suitcase', name: { 'zh-CN': '在日天数与出入境记录', 'ja-JP': '在日日数・出入国記録' },
    description: { 'zh-CN': '记录出入境日期，汇总指定期间的在日天数。', 'ja-JP': '出入国日を記録し、指定期間の在日日数を集計します。' },
    duration: { 'zh-CN': '随时记录', 'ja-JP': '随時記録' }, results: { 'zh-CN': '年度汇总、期间统计、CSV 备份', 'ja-JP': '年別集計、期間集計、CSVバックアップ' }, status: 'available', route: '/tools/stay-days',
  },
  {
    id: 'takken', category: 'exam', icon: 'Reading', name: { 'zh-CN': '宅建考试刷题', 'ja-JP': '宅建過去問演習' },
    description: { 'zh-CN': '练习宅建历年真题，查看答题记录与解析。', 'ja-JP': '宅建過去問を演習し、解答履歴と解説を確認します。' },
    duration: { 'zh-CN': '不限时长', 'ja-JP': '時間制限なし' }, results: { 'zh-CN': '逐题解析、记忆口诀、作答统计', 'ja-JP': '設問別解説、記憶のコツ、解答統計' }, status: 'available', route: '/tools/takken',
  },
]

export function toolCountByCategory(id: DiagnosisTool['category']) {
  return tools.filter((tool) => tool.category === id).length
}

export const categories: CategoryInfo[] = categoryMeta.map((category) => ({
  ...category,
  count: toolCountByCategory(category.id),
}))

export const featuredTools: DiagnosisTool[] = tools.filter((tool) => tool.featured)

export function categoryName(id: DiagnosisTool['category']) {
  return categories.find((category) => category.id === id)?.name ?? { 'zh-CN': '专业工具', 'ja-JP': '専門ツール' }
}
