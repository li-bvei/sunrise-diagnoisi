import type { CategoryInfo, DiagnosisTool } from '@/types/content'

const categoryMeta: Omit<CategoryInfo, 'count'>[] = [
  { id: 'residence', icon: 'Passport', name: { 'zh-CN': '在留・永住', 'ja-JP': '在留・永住' }, description: { 'zh-CN': '确认在留资格积分与永住申请条件。', 'ja-JP': '在留資格のポイントと永住許可の要件を確認します。' } },
  { id: 'property', icon: 'House', name: { 'zh-CN': '不动产', 'ja-JP': '不動産' }, description: { 'zh-CN': '整理在日租房的初期费用与材料。', 'ja-JP': '日本での賃貸契約に必要な初期費用と書類を整理します。' } },
  { id: 'income', icon: 'Coin', name: { 'zh-CN': '收入与经营', 'ja-JP': '収入・経営' }, description: { 'zh-CN': '估算工资到手、社会保险与役员报酬方案。', 'ja-JP': '給与手取り、社会保険、役員報酬プランを試算します。' } },
  { id: 'records', icon: 'Suitcase', name: { 'zh-CN': '在日记录', 'ja-JP': '在日記録' }, description: { 'zh-CN': '整理出入境记录并汇总在日天数。', 'ja-JP': '出入国記録を整理し、在日日数を集計します。' } },
  { id: 'exam', icon: 'Reading', name: { 'zh-CN': '资格考试', 'ja-JP': '資格試験' }, description: { 'zh-CN': '日本资格考试的刷题与学习工具。', 'ja-JP': '日本の資格試験対策用の演習・学習ツールです。' } },
]

export const tools: DiagnosisTool[] = [
  {
    id: 'highly-skilled', category: 'residence', icon: 'Medal', name: { 'zh-CN': '高度人才积分计算', 'ja-JP': '高度人材ポイント計算' },
    description: { 'zh-CN': '按活动类型、学历、职历、年收与加分项目计算高度人才积分，并附特别高度人才 J-Skip 基础判断。', 'ja-JP': '活動類型、学歴、職歴、年収、加点項目から高度人材ポイントを計算し、特別高度人材 J-Skip の基礎判定も表示します。' },
    duration: { 'zh-CN': '约 5 分钟', 'ja-JP': '約5分' }, results: { 'zh-CN': '资格初判、总积分、逐项明细', 'ja-JP': '資格の初期判断、合計点、項目別内訳' }, status: 'available', route: '/tools/highly-skilled', featured: true,
  },
  {
    id: 'permanent-residence', category: 'residence', icon: 'House', name: { 'zh-CN': '永住申请条件诊断', 'ja-JP': '永住許可要件診断' },
    description: { 'zh-CN': '按在留年限、纳税与社会保险、素行等条件，机械判断六条永住路径。', 'ja-JP': '在留年数、納税・社会保険、素行などの条件から6つの永住ルートを機械的に判定します。' },
    duration: { 'zh-CN': '约 5 分钟', 'ja-JP': '約5分' }, results: { 'zh-CN': '条件初判、逐项明细、改善建议', 'ja-JP': '要件の初期判断、項目別内訳、改善提案' }, status: 'available', route: '/tools/permanent-residence', featured: true,
  },
  {
    id: 'rental', category: 'property', icon: 'Key', name: { 'zh-CN': '租房初期费用诊断', 'ja-JP': '賃貸初期費用診断' },
    description: { 'zh-CN': '按房源实际收费逐项勾选填写，生成可交给客户的费用与材料清单。', 'ja-JP': '物件ごとの実費を項目別に入力し、お客様にお渡しできる費用・書類リストを作成します。' },
    duration: { 'zh-CN': '约 3 分钟', 'ja-JP': '約3分' }, results: { 'zh-CN': '初期费用明细、材料清单、可打印报告', 'ja-JP': '初期費用内訳、必要書類、印刷用レポート' }, status: 'available', route: '/tools/rental-cost', featured: true,
  },
  {
    id: 'salary', category: 'income', icon: 'Coin', name: { 'zh-CN': '工资、社保与到手金额', 'ja-JP': '給与・社会保険・手取り' },
    description: { 'zh-CN': '输入每月报酬，看清员工实际到手、公司实际雇佣成本与社会保险等级。', 'ja-JP': '月額報酬から従業員の手取り、会社の実質雇用コスト、社会保険の等級を確認します。' },
    duration: { 'zh-CN': '约 1 分钟', 'ja-JP': '約1分' }, results: { 'zh-CN': '月／年到手、公司成本、保险与税金明细', 'ja-JP': '月額・年額手取り、会社負担、保険・税の内訳' }, status: 'available', route: '/tools/salary',
  },
  {
    id: 'executive-compensation', category: 'income', icon: 'Briefcase', name: { 'zh-CN': '役员报酬模拟', 'ja-JP': '役員報酬シミュレーター' },
    description: { 'zh-CN': '比较不同役员报酬方案下的个人到手、公司社保负担、法人税与税后留存利润。', 'ja-JP': '役員報酬プランごとの個人手取り、会社の社会保険負担、法人税、税引後の留保利益を比較します。' },
    duration: { 'zh-CN': '约 3 分钟', 'ja-JP': '約3分' }, results: { 'zh-CN': '方案对比、个人到手、法人税、留存利润', 'ja-JP': 'プラン比較、個人手取り、法人税、留保利益' }, status: 'available', route: '/tools/executive-compensation',
  },
  {
    id: 'stay-days', category: 'records', icon: 'Suitcase', name: { 'zh-CN': '在日天数与出入境记录', 'ja-JP': '在日日数・出入国記録' },
    description: { 'zh-CN': '本地保存出入境记录，按年度或指定期间统计在日天数。', 'ja-JP': '出入国記録を端末内に保存し、年別・指定期間の在日日数を集計します。' },
    duration: { 'zh-CN': '随时记录', 'ja-JP': '随時記録' }, results: { 'zh-CN': '年度汇总、期间统计、CSV 备份', 'ja-JP': '年別集計、期間集計、CSVバックアップ' }, status: 'available', route: '/tools/stay-days',
  },
  {
    id: 'takken', category: 'exam', icon: 'Reading', name: { 'zh-CN': '宅建考试刷题', 'ja-JP': '宅建過去問演習' },
    description: { 'zh-CN': '按分类练习宅地建物取引士历年真题，记录作答历史并巩固薄弱题。', 'ja-JP': '宅建過去問をカテゴリー別に演習し、解答履歴から弱点を強化します。' },
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
