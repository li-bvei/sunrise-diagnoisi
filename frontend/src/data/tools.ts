import type { CategoryInfo, DiagnosisTool } from '@/types/content'

export const categories: CategoryInfo[] = [
  { id: 'residence', icon: 'Passport', name: { 'zh-CN': '在留・永住', 'ja-JP': '在留・永住' }, description: { 'zh-CN': '确认在留资格、积分与永住相关条件。', 'ja-JP': '在留資格、ポイント、永住に関する条件を確認します。' }, count: 3 },
  { id: 'property', icon: 'House', name: { 'zh-CN': '不动产', 'ja-JP': '不動産' }, description: { 'zh-CN': '计算在日租房所需的初期费用。', 'ja-JP': '日本での賃貸契約に必要な初期費用を計算します。' }, count: 1 },
  { id: 'income', icon: 'Coin', name: { 'zh-CN': '收入与社会保险', 'ja-JP': '収入・社会保険' }, description: { 'zh-CN': '估算工资、标准报酬及公司实际负担。', 'ja-JP': '給与、標準報酬、会社の実質負担を試算します。' }, count: 3 },
  { id: 'pension', icon: 'TrendCharts', name: { 'zh-CN': '年金', 'ja-JP': '年金' }, description: { 'zh-CN': '估算未来年金，或从目标领取额反推。', 'ja-JP': '将来の年金見込額と目標額からの逆算を行います。' }, count: 2 },
  { id: 'records', icon: 'Suitcase', name: { 'zh-CN': '在日记录', 'ja-JP': '在日記録' }, description: { 'zh-CN': '整理出入境记录并汇总在日天数。', 'ja-JP': '出入国記録を整理し、在日日数を集計します。' }, count: 1 },
  { id: 'exam', icon: 'Reading', name: { 'zh-CN': '资格考试', 'ja-JP': '資格試験' }, description: { 'zh-CN': '日本资格考试的刷题与学习工具。', 'ja-JP': '日本の資格試験対策用の演習・学習ツールです。' }, count: 1 },
]

export const tools: DiagnosisTool[] = [
  {
    id: 'highly-skilled', category: 'residence', icon: 'Medal', name: { 'zh-CN': '高度人才积分计算', 'ja-JP': '高度人材ポイント計算' },
    description: { 'zh-CN': '按照活动类型、学历、职历、年收和加分项目，实时计算高度人才积分。', 'ja-JP': '活動類型、学歴、職歴、年収、加点項目から高度人材ポイントを計算します。' },
    duration: { 'zh-CN': '约 5～8 分钟', 'ja-JP': '約5～8分' }, results: { 'zh-CN': '资格初判、总积分、逐项明细、注意事项', 'ja-JP': '資格の初期判断、合計点、項目別内訳、注意事項' }, status: 'available', route: '/tools/highly-skilled',
  },
  {
    id: 'j-skip', category: 'residence', icon: 'Promotion', name: { 'zh-CN': '特别高度人才J-Skip诊断', 'ja-JP': '特別高度人材J-Skip診断' },
    description: { 'zh-CN': '按活动、学历或职历及年收入判断J-Skip基础条件，已合并至高度人才计算。', 'ja-JP': '活動、学歴または職歴、年収からJ-Skipの基礎要件を判定します。' },
    duration: { 'zh-CN': '约 3 分钟', 'ja-JP': '約3分' }, results: { 'zh-CN': '基础条件判断、未满足条件、证明方向', 'ja-JP': '基礎要件判定、不足要件、立証の方向性' }, status: 'available', route: '/tools/highly-skilled',
  },
  {
    id: 'permanent-residence', category: 'residence', icon: 'House', name: { 'zh-CN': '永住申请条件诊断', 'ja-JP': '永住許可要件診断' },
    description: { 'zh-CN': '确认在留年限、纳税与社会保险、品行及高度人才相关永住条件。', 'ja-JP': '在留年数、納税・社会保険、素行、高度人材に関する永住要件を確認します。' },
    duration: { 'zh-CN': '约 5～8 分钟', 'ja-JP': '約5～8分' }, results: { 'zh-CN': '条件初判、逐项明细、改善建议', 'ja-JP': '要件の初期判断、項目別内訳、改善提案' }, status: 'available', route: '/tools/permanent-residence',
  },
  {
    id: 'rental', category: 'property', icon: 'Key', name: { 'zh-CN': '租房初期费用诊断', 'ja-JP': '賃貸初期費用診断' },
    description: { 'zh-CN': '计算敷金、礼金、仲介手续费、保证公司及日割房租等费用。', 'ja-JP': '敷金、礼金、仲介手数料、保証会社費用、日割賃料などを計算します。' },
    duration: { 'zh-CN': '约 3 分钟', 'ja-JP': '約3分' }, results: { 'zh-CN': '初期费用明细、签约金额、注意事项', 'ja-JP': '初期費用内訳、契約金額、注意事項' }, status: 'available', route: '/tools/rental-cost',
  },
  {
    id: 'payroll', category: 'income', icon: 'Coin', name: { 'zh-CN': '工资手取与公司实际成本', 'ja-JP': '給与手取り・会社実質負担' },
    description: { 'zh-CN': '同时估算员工月到手、社会保险与公司的实际雇佣成本。', 'ja-JP': '月額手取り、社会保険料、会社の実質雇用コストを同時に試算します。' },
    duration: { 'zh-CN': '约 2 分钟', 'ja-JP': '約2分' }, results: { 'zh-CN': '月到手、公司月成本、保险与税金明细', 'ja-JP': '月額手取り、会社負担、保険・税の内訳' }, status: 'available', route: '/tools/payroll',
  },
  {
    id: 'standard-remuneration', category: 'income', icon: 'Connection', name: { 'zh-CN': '标准报酬月额反查', 'ja-JP': '標準報酬月額逆引き' },
    description: { 'zh-CN': '按实际月额报酬确认健康保险与厚生年金等级及临界区间。', 'ja-JP': '実際の月額報酬から健康保険・厚生年金の等級と境界を確認します。' },
    duration: { 'zh-CN': '约 1 分钟', 'ja-JP': '約1分' }, results: { 'zh-CN': '当前等级、上下一级、适用范围', 'ja-JP': '現在等級、隣接等級、適用範囲' }, status: 'available', route: '/tools/standard-remuneration',
  },
  {
    id: 'executive-compensation', category: 'income', icon: 'Briefcase', name: { 'zh-CN': '役员报酬模拟器', 'ja-JP': '役員報酬シミュレーター' },
    description: { 'zh-CN': '比较多个役员报酬方案下的个人手取与公司实际成本。', 'ja-JP': '複数の役員報酬案について個人手取りと会社負担を比較します。' },
    duration: { 'zh-CN': '约 3 分钟', 'ja-JP': '約3分' }, results: { 'zh-CN': '方案对比、个人手取、公司余额', 'ja-JP': 'プラン比較、個人手取り、会社残額' }, status: 'available', route: '/tools/executive-compensation',
  },
  {
    id: 'pension-estimate', category: 'pension', icon: 'TrendCharts', name: { 'zh-CN': '日本年金领取额估算', 'ja-JP': '年金受給見込額' },
    description: { 'zh-CN': '按参保月数与平均标准报酬简易估算未来年金。', 'ja-JP': '加入月数と平均標準報酬から将来の年金額を簡易試算します。' },
    duration: { 'zh-CN': '约 3 分钟', 'ja-JP': '約3分' }, results: { 'zh-CN': '月领取额、年领取额、构成明细', 'ja-JP': '月額、年額、構成内訳' }, status: 'available', route: '/tools/pension',
  },
  {
    id: 'pension-target', category: 'pension', icon: 'Promotion', name: { 'zh-CN': '年金目标反推工资', 'ja-JP': '年金目標額から給与逆算' },
    description: { 'zh-CN': '从希望领取的年金月额反推今后所需平均标准报酬。', 'ja-JP': '希望する年金月額から今後必要な平均標準報酬を逆算します。' },
    duration: { 'zh-CN': '约 3 分钟', 'ja-JP': '約3分' }, results: { 'zh-CN': '目标差额、所需报酬、可达性提示', 'ja-JP': '目標差額、必要報酬、到達可能性' }, status: 'available', route: '/tools/pension?tab=target',
  },
  {
    id: 'stay-days', category: 'records', icon: 'Suitcase', name: { 'zh-CN': '在日天数与出入境记录', 'ja-JP': '在日日数・出入国記録' },
    description: { 'zh-CN': '本地保存出入境记录，按年度或指定期间统计在日天数。', 'ja-JP': '出入国記録を端末内に保存し、年別・指定期間の在日日数を集計します。' },
    duration: { 'zh-CN': '随时记录', 'ja-JP': '随時記録' }, results: { 'zh-CN': '年度汇总、期间统计、CSV备份', 'ja-JP': '年別集計、期間集計、CSVバックアップ' }, status: 'available', route: '/tools/stay-days',
  },
  {
    id: 'takken', category: 'exam', icon: 'Reading', name: { 'zh-CN': '宅建考试刷题', 'ja-JP': '宅建過去問演習' },
    description: { 'zh-CN': '按分类练习宅地建物取引士历年真题，记录作答历史并巩固薄弱题。', 'ja-JP': '宅建過去問をカテゴリー別に演習し、解答履歴から弱点を強化します。' },
    duration: { 'zh-CN': '不限时长，随时练习', 'ja-JP': '時間制限なし' }, results: { 'zh-CN': '逐题解析、记忆口诀、作答统计', 'ja-JP': '設問別解説、記憶のコツ、解答統計' }, status: 'available', route: '/tools/takken',
  },
]

export function categoryName(id: DiagnosisTool['category']) {
  return categories.find((category) => category.id === id)?.name ?? { 'zh-CN': '专业工具', 'ja-JP': '専門ツール' }
}
