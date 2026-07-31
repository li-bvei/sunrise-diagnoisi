import type { CategoryInfo, DiagnosisTool } from '@/types/content'

export const categories: CategoryInfo[] = [
  {
    id: 'residence',
    icon: 'Passport',
    name: { 'zh-CN': '在留・永住', 'ja-JP': '在留・永住' },
    description: { 'zh-CN': '确认在留资格、积分与永住相关条件。', 'ja-JP': '在留資格、ポイント、永住に関する条件を確認します。' },
    count: 3,
  },
  {
    id: 'property',
    icon: 'House',
    name: { 'zh-CN': '不动产', 'ja-JP': '不動産' },
    description: { 'zh-CN': '梳理买房、租房与卖房涉及的费用及手续。', 'ja-JP': '購入・賃貸・売却に伴う費用と手続きを整理します。' },
    count: 3,
  },
  {
    id: 'business',
    icon: 'OfficeBuilding',
    name: { 'zh-CN': '公司・雇佣', 'ja-JP': '会社・雇用' },
    description: { 'zh-CN': '了解公司经营、设立与雇佣相关成本。', 'ja-JP': '会社経営・設立・雇用に関するコストを確認します。' },
    count: 2,
  },
  {
    id: 'life',
    icon: 'Suitcase',
    name: { 'zh-CN': '离日・年金', 'ja-JP': '離日・年金' },
    description: { 'zh-CN': '确认离日前手续与年金相关事项。', 'ja-JP': '離日前の手続きと年金に関する事項を確認します。' },
    count: 1,
  },
]

export const tools: DiagnosisTool[] = [
  {
    id: 'highly-skilled',
    category: 'residence',
    icon: 'Medal',
    name: { 'zh-CN': '高度人才积分计算', 'ja-JP': '高度人材ポイント計算' },
    description: {
      'zh-CN': '按照活动类型、学历、职历、年收和加分项目，实时计算高度人才积分。',
      'ja-JP': '活動類型、学歴、職歴、年収、加点項目から高度人材ポイントを計算します。',
    },
    duration: { 'zh-CN': '约 5～8 分钟', 'ja-JP': '約5～8分' },
    results: {
      'zh-CN': '资格初判、总积分、逐项明细、注意事项',
      'ja-JP': '資格の初期判断、合計点、項目別内訳、注意事項',
    },
    status: 'available',
    route: '/tools/highly-skilled',
  },
  {
    id: 'j-skip',
    category: 'residence',
    icon: 'Promotion',
    name: { 'zh-CN': '特别高度人才J-Skip诊断', 'ja-JP': '特別高度人材J-Skip診断' },
    description: {
      'zh-CN': '不使用70分积分，按活动、学历或职历及年收入独立判断J-Skip基础条件；现已合并至高度人才积分计算结果中。',
      'ja-JP': '70点のポイント制を使わず、活動、学歴または職歴、年収からJ-Skipの基礎要件を判定します。現在は高度人材ポイント計算の結果に統合されています。',
    },
    duration: { 'zh-CN': '约 3 分钟', 'ja-JP': '約3分' },
    results: {
      'zh-CN': '基础条件判断、未满足条件、证明方向',
      'ja-JP': '基礎要件判定、不足要件、立証の方向性',
    },
    status: 'available',
    route: '/tools/highly-skilled',
  },
  {
    id: 'permanent-residence',
    category: 'residence',
    icon: 'House',
    name: { 'zh-CN': '永住申请条件诊断', 'ja-JP': '永住許可要件診断' },
    description: {
      'zh-CN': '独立确认在留年限、纳税与社会保险、品行及高度人才相关永住条件。',
      'ja-JP': '在留年数、納税・社会保険、素行、高度人材に関する永住要件を個別に確認します。',
    },
    duration: { 'zh-CN': '约 5～8 分钟', 'ja-JP': '約5～8分' },
    results: {
      'zh-CN': '条件初判、逐项明细、改善与准备建议',
      'ja-JP': '要件の初期判断、項目別内訳、改善・準備の提案',
    },
    status: 'available',
    route: '/tools/permanent-residence',
  },
  {
    id: 'business-readiness',
    category: 'business',
    icon: 'Briefcase',
    name: { 'zh-CN': '经营管理・在留资格准备度诊断', 'ja-JP': '経営管理・在留資格準備度診断' },
    description: {
      'zh-CN': '确认资本金、事务所、资金来源、事业计划及许可等准备情况。',
      'ja-JP': '資本金、事業所、資金の出所、事業計画、許認可などの準備状況を確認します。',
    },
    duration: { 'zh-CN': '约 5～8 分钟', 'ja-JP': '約5～8分' },
    results: { 'zh-CN': '准备度、缺少事项、注意事项、下一步建议', 'ja-JP': '準備度、不足項目、注意事項、次のステップ' },
    status: 'upcoming',
  },
  {
    id: 'home-purchase',
    category: 'property',
    icon: 'House',
    name: { 'zh-CN': '买房费用・手续诊断', 'ja-JP': '住宅購入費用・手続き診断' },
    description: {
      'zh-CN': '计算购房时可能发生的交易费用、税费及相关手续。',
      'ja-JP': '不動産購入時に発生する費用、税金、必要な手続きを確認します。',
    },
    duration: { 'zh-CN': '约 3～5 分钟', 'ja-JP': '約3～5分' },
    results: { 'zh-CN': '初期费用、税费概算、材料清单、交易流程', 'ja-JP': '初期費用、税額概算、書類一覧、取引の流れ' },
    status: 'upcoming',
  },
  {
    id: 'rental',
    category: 'property',
    icon: 'Key',
    name: { 'zh-CN': '租房初期费用诊断', 'ja-JP': '賃貸初期費用診断' },
    description: {
      'zh-CN': '计算敷金、礼金、仲介手续费、保证公司及日割房租等费用。',
      'ja-JP': '敷金、礼金、仲介手数料、保証会社費用、日割賃料などを計算します。',
    },
    duration: { 'zh-CN': '约 3 分钟', 'ja-JP': '約3分' },
    results: { 'zh-CN': '初期费用明细、签约金额、注意事项', 'ja-JP': '初期費用内訳、契約金額、注意事項' },
    status: 'available',
    route: '/tools/rental-cost',
  },
  {
    id: 'home-sale',
    category: 'property',
    icon: 'TrendCharts',
    name: { 'zh-CN': '卖房费用・税金诊断', 'ja-JP': '不動産売却費用・税金診断' },
    description: {
      'zh-CN': '计算不动产出售费用、手取金额及转让所得税概算。',
      'ja-JP': '不動産売却時の費用、手取額、譲渡所得税の概算を確認します。',
    },
    duration: { 'zh-CN': '约 5～8 分钟', 'ja-JP': '約5～8分' },
    results: { 'zh-CN': '交易费用、手取概算、税金概算、特例提醒', 'ja-JP': '取引費用、手取概算、税額概算、特例のご案内' },
    status: 'upcoming',
  },
  {
    id: 'company-payroll',
    category: 'business',
    icon: 'Coin',
    name: { 'zh-CN': '公司・工资综合计算', 'ja-JP': '会社・給与総合計算' },
    description: {
      'zh-CN': '计算工资手取、奖金手取、公司雇佣成本及公司设立费用。',
      'ja-JP': '給与・賞与の手取額、会社の雇用コスト、会社設立費用を計算します。',
    },
    duration: { 'zh-CN': '约 5～8 分钟', 'ja-JP': '約5～8分' },
    results: { 'zh-CN': '工资明细、公司成本、设立费用、注意事项', 'ja-JP': '給与明細、会社負担、設立費用、注意事項' },
    status: 'upcoming',
  },
  {
    id: 'departure-pension',
    category: 'life',
    icon: 'Ship',
    name: { 'zh-CN': '离开日本・年金手续诊断', 'ja-JP': '離日・年金手続き診断' },
    description: {
      'zh-CN': '确认年金脱退一时金及离开日本前需要办理的主要手续。',
      'ja-JP': '脱退一時金および日本を離れる前に必要となる主な手続きを確認します。',
    },
    duration: { 'zh-CN': '约 5 分钟', 'ja-JP': '約5分' },
    results: { 'zh-CN': '年金概算、离日手续、税务提醒、材料清单', 'ja-JP': '年金概算、離日手続き、税務上の注意、書類一覧' },
    status: 'upcoming',
  },
]

export function categoryName(id: DiagnosisTool['category']) {
  return categories.find((category) => category.id === id)?.name ?? {
    'zh-CN': '专业诊断',
    'ja-JP': '専門診断',
  }
}
