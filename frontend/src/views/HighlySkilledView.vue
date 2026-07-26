<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft, ArrowRight, Check, Clock, DocumentChecked, InfoFilled,
  Refresh, WarningFilled,
} from '@element-plus/icons-vue'
import { useSettingsStore } from '@/stores/settings'
import UniversitySelector from '@/components/highly-skilled/UniversitySelector.vue'
import HelpPopover from '@/components/HelpPopover.vue'
import DiagnosisReportView from '@/components/highly-skilled/DiagnosisReportView.vue'
import ScoreBreakdownChart from '@/components/highly-skilled/ScoreBreakdownChart.vue'
import ScoreProgressChart from '@/components/highly-skilled/ScoreProgressChart.vue'
import { officialSources } from '@/data/officialSources'
import { buildCategoryChart, calculateAge, calculateHighlySkilled, createDiagnosisReport } from '@/utils/highlySkilledCalculator'
import {
  formatIncomeManYen, formatInteger, MAX_EXPERIENCE_YEARS,
  parseIncomeManYenInput, parseIntegerInput,
} from '@/utils/numericInput'
import type {
  DiagnosisReport, EducationLevel, HighlySkilledInput,
  HighlySkilledResult, JapaneseLevel, ManagementPosition,
} from '@/types/highlySkilled'

type FormModel = Omit<HighlySkilledInput, 'age' | 'annualIncome' | 'experienceYears'> & {
  age: number
  annualIncome: number | null
  experienceYears: number | null
}

const settings = useSettingsStore()
const activeStep = ref(0)
const result = ref<HighlySkilledResult | null>(null)
const report = ref<DiagnosisReport | null>(null)
const reportVisible = ref(false)
const incomeText = ref('')
const experienceText = ref('')
const resultSection = ref<HTMLElement>()
const localToday = new Date()
const today = [
  localToday.getFullYear(),
  String(localToday.getMonth() + 1).padStart(2, '0'),
  String(localToday.getDate()).padStart(2, '0'),
].join('-')
const earliestBirthDate = new Date()
earliestBirthDate.setFullYear(earliestBirthDate.getFullYear() - 100)

const initialForm = (): FormModel => ({
  name: '',
  phone: '',
  birthDate: '',
  diagnosisDate: today,
  activity: 'professional',
  age: -1,
  annualIncome: null,
  education: 'other',
  experienceYears: null,
  researchAchievements: 0,
  japaneseLevel: 'none',
  qualificationCount: 0,
  managementPosition: 'none',
  university: { countryCode: 'JP', universityId: null, searchText: '', manualReview: false },
  multipleDegrees: false,
  japaneseUniversity: false,
  innovationOrganization: false,
  innovationSme: false,
  growthField: false,
  localGovernmentSupport: false,
  foreignQualification: false,
  baseActivityConfirmed: false,
})
const form = reactive<FormModel>(initialForm())

const zh = computed(() => settings.locale === 'zh-CN')
const copy = computed(() => zh.value ? {
  eyebrow: '高度人才积分制度',
  title: '高度人才积分计算',
  intro: '按入管厅公开积分表计算高度专业职1号イ、ロ、ハ积分。本工具与J-Skip完全独立。',
  available: '可使用', duration: '约 7～10 分钟', privacy: '输入仅保存在当前页面，不发送、不保存',
  source: '规则版本：2026年7月', official: '查看入管厅积分制度',
  steps: ['活动类型', '个人与基本条件', '加分项目', '计算结果'],
  next: '下一步', previous: '上一步', calculate: '计算积分', points: '分',
  name: '姓名', phone: '电话号码', birth: '出生日期', diagnosis: '诊断基准日',
  income: '预计年收入', incomeHelp: '填写在日本从事拟申请活动可获得的税前预计年收入。', experience: '相关工作年限',
  education: '主要学历', research: '研究成果', qualification: '与职务相关的日本国家资格',
  result: '积分计算结果', pass: '达到 70 分积分门槛', fail: '尚未达到 70 分积分门槛',
  preliminaryPass: '初步判断：符合', preliminaryReview: '初步判断：仍需确认',
  breakdown: '积分明细', suggestions: '改善与准备建议', report: '生成诊断报告',
  reset: '重新计算', total: '总积分', missing: '距离门槛还差',
  baseConfirm: '我已确认拟从事活动符合对应就劳在留资格的活动范围和基础条件',
  validation: '请完整填写姓名、电话、有效出生日期、诊断基准日、年收入和相关工作年限。',
  incomeFail: '1号イ、ロ原则上还需满足年收 300 万日元以上的最低年收基准。',
  baseFail: '尚未确认基础活动符合性，不能仅凭积分判断符合。',
  review: '以下内容需要人工确认',
  jskipLink: '年收入或职历较高？可另外确认特别高度人才J-Skip制度。',
} : {
  eyebrow: '高度人材ポイント制',
  title: '高度人材ポイント計算',
  intro: '入管庁の公開ポイント表に基づき、1号イ・ロ・ハを計算します。J-Skipとは完全に分離しています。',
  available: '利用可能', duration: '約7～10分', privacy: '入力はこのページ内のみ・送信も保存もしません',
  source: 'ルール版：2026年7月', official: '入管庁のポイント制度を見る',
  steps: ['活動類型', '本人・基本条件', '加点項目', '計算結果'],
  next: '次へ', previous: '戻る', calculate: 'ポイントを計算', points: '点',
  name: '氏名', phone: '電話番号', birth: '生年月日', diagnosis: '診断基準日',
  income: '予定年収', incomeHelp: '申請する活動により日本で受ける税引前の予定年収を入力してください。', experience: '関連実務経験',
  education: '主な学歴', research: '研究実績', qualification: '職務に関連する日本の国家資格',
  result: 'ポイント計算結果', pass: '70点の基準に到達', fail: '70点の基準に未到達',
  preliminaryPass: '初期判断：該当可能性あり', preliminaryReview: '初期判断：追加確認が必要',
  breakdown: 'ポイント内訳', suggestions: '改善・準備の提案', report: '診断レポートを生成',
  reset: 'もう一度計算', total: '合計ポイント', missing: '基準まであと',
  baseConfirm: '予定する活動が対応する就労資格の活動範囲と基礎要件を満たすことを確認しました',
  validation: '氏名、電話番号、有効な生年月日、診断基準日、年収、実務経験を入力してください。',
  incomeFail: '1号イ・ロでは原則として年収300万円以上の最低年収基準も必要です。',
  baseFail: '活動該当性が未確認のため、ポイントだけでは判断できません。',
  review: '個別確認が必要な項目',
  jskipLink: '高い年収または十分な職歴がある方は、特別高度人材J-Skip制度も別途確認できます。',
})

const activities = computed(() => zh.value ? [
  { value: 'academic', icon: '研', title: '大学、研究机构或专业研究工作', desc: '适合在大学、研究机构等从事研究、教育或学术工作的人员。', tag: '对应：高度専門職1号イ（高度学術研究活動）' },
  { value: 'professional', icon: '技', title: '企业技术、专业知识或国际业务工作', desc: '适合在日本企业从事技术开发、IT、工程、翻译、贸易、企划、设计、法律、会计等专业工作的人员。', tag: '对应：高度専門職1号ロ（高度専門・技術活動）' },
  { value: 'management', icon: '经', title: '公司经营或管理工作', desc: '适合在日本经营公司，或担任公司管理人员、董事及代表人员的人员。', tag: '对应：高度専門職1号ハ（高度経営・管理活動）' },
] : [
  { value: 'academic', icon: '研', title: '大学・研究機関等で研究や教育を行う方', desc: '大学、研究機関等で研究、教育または専門的な学術活動を行う方向けです。', tag: '高度専門職1号イ（高度学術研究活動）' },
  { value: 'professional', icon: '技', title: '企業で技術・専門業務に従事する方', desc: 'IT、技術開発、設計、通訳、貿易、企画、法律、会計などの専門業務に従事する方向けです。', tag: '高度専門職1号ロ（高度専門・技術活動）' },
  { value: 'management', icon: '営', title: '会社を経営・管理する方', desc: '日本で会社を経営する方、または取締役、代表者、管理職等として事業管理に従事する方向けです。', tag: '高度専門職1号ハ（高度経営・管理活動）' },
])

const educationOptions = computed(() => {
  const zhItems = {
    bachelor: ['本科', '中国通常为本科毕业并取得学士学位。'],
    master: ['硕士', '已取得硕士学位，包括符合条件的专业硕士。'],
    doctorate: ['博士', '已取得博士学位，不包括仅完成博士课程但未取得学位。'],
    professional_degree: ['专业职学位', '日本或其他国家依法授予的专业职学位，是否适用需根据证明文件确认。'],
    other: ['其他或不确定', '大专、专科、未取得学位或无法判断的情况。'],
  }
  const jaItems = {
    bachelor: ['学士', '大学を卒業し、学士の学位を取得した方。'],
    master: ['修士', '修士の学位を取得した方（対象となる専門修士を含む）。'],
    doctorate: ['博士', '博士の学位を取得した方。課程修了のみは含みません。'],
    professional_degree: ['専門職学位', '法令に基づく専門職学位。証明書による個別確認が必要です。'],
    other: ['その他・不明', '短大・専門学校、学位未取得、または判断できない場合。'],
  }
  const items = zh.value ? zhItems : jaItems
  return (Object.entries(items) as Array<[EducationLevel, string[]]>).map(([value, text]) => ({ value, label: text[0], desc: text[1] }))
})

const japaneseOptions: Array<{ value: JapaneseLevel; zh: string; ja: string }> = [
  { value: 'none', zh: '无对应加分', ja: '加点対象なし' },
  { value: 'n2', zh: 'JLPT N2 / BJT 400分以上等（10分）', ja: 'JLPT N2・BJT 400点以上等（10点）' },
  { value: 'n1', zh: 'JLPT N1 / BJT 480分以上等（15分）', ja: 'JLPT N1・BJT 480点以上等（15点）' },
]
const positionOptions: Array<{ value: ManagementPosition; zh: string; ja: string }> = [
  { value: 'none', zh: '其他管理职位', ja: 'その他の管理職' },
  { value: 'director', zh: '董事・执行职位', ja: '取締役・執行役' },
  { value: 'representative', zh: '代表董事・代表执行职位', ja: '代表取締役・代表執行役' },
]

type BonusKey =
  | 'multipleDegrees'
  | 'innovationOrganization'
  | 'innovationSme'
  | 'growthField'
  | 'localGovernmentSupport'
  | 'foreignQualification'

interface BonusOption {
  key: BonusKey
  title: string
  description: string
  help: string
  sourceUrl: string
}

const bonusOptions = computed<BonusOption[]>(() => [
  {
    key: 'multipleDegrees',
    title: zh.value ? '不同领域的多个学位' : '複数分野の学位',
    description: zh.value ? '不同领域的博士、硕士或专业职学位（5分）' : '異なる分野の博士・修士・専門職学位（5点）',
    help: zh.value
      ? '必须持有两个以上且属于不同专业领域的博士、硕士或专业职学位。仅有一个学位、同一领域的多个证书或结业证明不符合；审查时可能要求成绩单说明专业领域。'
      : '異なる分野の博士・修士・専門職学位を複数有することが必要です。単一学位、同一分野の複数証明、修了証のみは対象外で、成績証明書を求められる場合があります。',
    sourceUrl: officialSources.pointEvidence.url,
  },
  {
    key: 'innovationOrganization',
    title: zh.value ? '创新促进支援机构' : 'イノベーション促進支援機関',
    description: zh.value ? '受入机构属于官方指定支援措施对象（10分）' : '受入機関が公式の指定支援措置対象（10点）',
    help: zh.value
      ? '不是只要公司从事“创新”业务就能加分。您的受入机构必须实际属于入管厅公布的创新促进支援措施对象，并能提交机构出具的证明。'
      : '「イノベーション事業」を行うだけでは対象になりません。受入機関が入管庁公表のイノベーション促進支援措置の対象であり、機関の証明資料が必要です。',
    sourceUrl: officialSources.innovation.url,
  },
  {
    key: 'innovationSme',
    title: zh.value ? '符合条件的中小企业追加' : '対象中小企業の追加',
    description: zh.value ? '上述机构同时属于对象中小企业（追加10分）' : '上記機関が対象中小企業の場合（追加10点）',
    help: zh.value
      ? '这是创新促进支援机构项目的追加分，不能单独选择。除先满足上一项外，受入机构还必须符合官方所称中小企业的范围并能证明。'
      : 'イノベーション促進支援機関の加点に対する追加点で、単独では選べません。前項を満たし、受入機関が公的な中小企業の範囲に該当する証明も必要です。',
    sourceUrl: officialSources.innovation.url,
  },
  {
    key: 'growthField',
    title: zh.value ? '指定成长领域尖端事业' : '指定成長分野の先端事業',
    description: zh.value ? '从事告示指定的成长领域尖端事业（10分）' : '告示指定の成長分野先端事業（10点）',
    help: zh.value
      ? '只有实际从事入管厅公布名单中的、由主管部门参与并事先认定的尖端项目才适用。仅在IT、医疗、AI等行业工作并不会自动符合。'
      : '所管省庁が関与し事前認定された公表一覧上の先端プロジェクトに実際に従事する場合が対象です。IT、医療、AI等の業界に属するだけでは該当しません。',
    sourceUrl: officialSources.growthField.url,
  },
  {
    key: 'localGovernmentSupport',
    title: zh.value ? '地方公共团体支援措施' : '地方公共団体の支援措置',
    description: zh.value ? '受入机构符合指定地方支援措施（10分）' : '指定された地方支援措置（10点）',
    help: zh.value
      ? '受入机构必须正在接受经法务大臣认定的地方政府补助或同等支援。公司仅位于有关地区、加入当地组织或曾获得一般性服务并不等于符合。'
      : '受入機関が法務大臣認定の地方公共団体による補助金等の支援を現に受けていることが必要です。所在地や一般的な地域サービスだけでは対象外です。',
    sourceUrl: officialSources.localGovernment.url,
  },
  {
    key: 'foreignQualification',
    title: zh.value ? '指定外国资格・表彰' : '指定外国資格・表彰',
    description: zh.value ? '仅限官方名单所列资格或表彰（5分）' : '公式一覧掲載の資格・表彰のみ（5点）',
    help: zh.value
      ? '只认入管厅名单中明确列出的外国资格或表彰，例如名单规定范围内的USCPA、外国律师资格等。一般职业证书、公司内部认证或未列明奖项不能加分。'
      : '入管庁の一覧に明記された外国資格・表彰（対象範囲内のUSCPA、外国弁護士資格等）のみです。一般の民間資格、社内認定、一覧外の受賞は対象外です。',
    sourceUrl: officialSources.foreignQualification.url,
  },
])

const age = computed(() => calculateAge(form.birthDate, form.diagnosisDate))
const educationAllowsBonus = computed(() => form.education !== 'other')
const resultCategoryChart = computed(() => result.value ? buildCategoryChart(result.value.items) : [])
watch(age, (value) => { form.age = value })
watch(() => form.activity, (value) => {
  if (value === 'management') { form.researchAchievements = 0; form.qualificationCount = 0 }
  if (value === 'academic') { form.qualificationCount = 0; form.managementPosition = 'none' }
  if (value === 'professional') form.managementPosition = 'none'
})
watch(() => form.innovationOrganization, (value) => { if (!value) form.innovationSme = false })
watch(() => form.education, (value) => {
  if (value === 'other') {
    form.multipleDegrees = false
  }
})
watch(() => settings.locale, (locale) => {
  if (!report.value || !result.value) return
  report.value = createDiagnosisReport({
    ...form,
    annualIncome: form.annualIncome as number,
    experienceYears: form.experienceYears as number,
    university: { ...form.university },
  }, result.value, locale)
})

function disabledDate(date: Date, birth = false) {
  const end = new Date()
  if (birth) return date > end || date < earliestBirthDate
  return date > end
}
function validBase() {
  return form.name.trim().length > 0 && form.name.trim().length <= 80
    && form.phone.trim().length >= 7 && form.phone.trim().length <= 30
    && age.value >= 0 && age.value <= 100
    && !!form.diagnosisDate && form.annualIncome !== null && form.annualIncome >= 0
    && form.experienceYears !== null && form.experienceYears >= 0
}
function updateIncome(value: string) {
  form.annualIncome = parseIncomeManYenInput(value)
  incomeText.value = form.annualIncome === null ? '' : value.replace(/，/g, ',')
}
function updateExperience(value: string) {
  form.experienceYears = parseIntegerInput(value, MAX_EXPERIENCE_YEARS)
  experienceText.value = form.experienceYears === null ? '' : value
}
function formatIncome() { incomeText.value = formatIncomeManYen(form.annualIncome) }
function formatExperience() { experienceText.value = formatInteger(form.experienceYears) }
function nextStep() {
  if (activeStep.value === 1 && !validBase()) return ElMessage.warning(copy.value.validation)
  activeStep.value = Math.min(2, activeStep.value + 1)
  document.querySelector('.calculator-shell')?.scrollIntoView({ behavior: 'smooth' })
}
function previousStep() { activeStep.value = Math.max(0, activeStep.value - 1) }
async function calculate() {
  if (!validBase()) { activeStep.value = 1; return ElMessage.warning(copy.value.validation) }
  form.name = form.name.trim()
  form.phone = form.phone.trim()
  result.value = calculateHighlySkilled({
    ...form,
    annualIncome: form.annualIncome as number,
    experienceYears: form.experienceYears as number,
    university: { ...form.university },
  })
  report.value = null
  activeStep.value = 3
  await nextTick()
  resultSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
function createReport() {
  if (!result.value) return
  report.value = createDiagnosisReport({
    ...form,
    annualIncome: form.annualIncome as number,
    experienceYears: form.experienceYears as number,
    university: { ...form.university },
  }, result.value, settings.locale)
  reportVisible.value = true
}
function printReport() { window.print() }
function reset() {
  Object.assign(form, initialForm())
  incomeText.value = ''
  experienceText.value = ''
  result.value = null
  report.value = null
  activeStep.value = 0
}
function itemLabel(key: string) {
  const labels: Record<string, [string, string]> = {
    education: ['学历', '学歴'], experience: ['相关职历', '関連職歴'], income: ['预计年收入', '予定年収'],
    age: ['年龄', '年齢'], research: ['研究成果', '研究実績'], qualification: ['日本国家资格', '日本の国家資格'],
    representative: ['代表职位', '代表者の地位'], director: ['董事・执行职位', '取締役・執行役'],
    multipleDegrees: ['不同领域多个学位', '複数分野の学位'], japaneseUniversity: ['日本高等教育机构学位', '日本の高等教育機関の学位'],
    topUniversity: ['指定世界大学排名院校', '指定世界大学ランキング校'], japaneseN1: ['日语能力 N1 等', '日本語能力 N1等'],
    japaneseN2: ['日语能力 N2 等', '日本語能力 N2等'], innovationOrganization: ['创新促进支援机构', 'イノベーション促進支援機関'],
    innovationSme: ['对象中小企业追加', '対象中小企業の追加'], growthField: ['指定成长领域尖端事业', '指定成長分野の先端事業'],
    localGovernmentSupport: ['地方公共团体支援措施', '地方公共団体の支援措置'], foreignQualification: ['指定外国资格・表彰', '指定外国資格・表彰'],
  }
  return labels[key]?.[zh.value ? 0 : 1] ?? key
}
function suggestionText(key: string) {
  const labels: Record<string, [string, string]> = {
    prepareEvidence: ['积分已达标。下一步优先逐项准备学位、职历、年收和加分证明；未能证明的项目不能计分。', '基準点に到達しています。学歴、職歴、年収、加点項目の証明資料を項目ごとに準備してください。'],
    japaneseN2: ['如实际取得 JLPT N2 或同等官方认定，可增加 10 分；请以合格证书为准。', 'JLPT N2等を取得できれば10点加算の可能性があります。合格証明が必要です。'],
    japaneseN1Upgrade: ['当前为N2档位；如取得JLPT N1或BJT 480分以上，可核对更高档位。', '現在はN2区分です。JLPT N1またはBJT 480点以上を取得した場合、上位区分を確認できます。'],
    gapTo80: [`当前确定积分距离80分还差 ${Math.max(0, 80 - (result.value?.confirmedTotal ?? 0))} 分。`, `確定点は80点まであと${Math.max(0, 80 - (result.value?.confirmedTotal ?? 0))}点です。`],
    qualificationReview: ['可根据预定职务核对是否持有直接相关的日本国家资格；民间或无关资格不计入。', '予定職務に直接関連する日本の国家資格があるか確認してください。民間資格や無関係な資格は対象外です。'],
    researchEvidence: ['研究成果已列为待确认，请优先准备专利、研究资助决定或论文检索证明。', '研究実績は確認待ちです。特許、研究費採択、論文検索資料を優先して準備してください。'],
    japaneseDegreeN2Exclusion: ['已勾选日本高等教育机构学位；按官方规则，N2档日语加分不与该项目重复计入。N1档不受此项排除。', '日本の高等教育機関の学位を選択したため、公式ルールによりN2区分は重複加点しません。N1区分はこの除外対象ではありません。'],
    japaneseDegreeSelection: ['如确实在日本的高等教育机构取得学位，可勾选该独立加分项目。', '日本の高等教育機関で学位を取得した場合は、この独立加点項目を選択できます。'],
    verifyUniversity: ['再次用毕业证上的中英文正式校名搜索大学名单；未找到时应申请人工确认，不要自行计分。', '卒業証明書の正式名称で大学一覧を再検索し、不明な場合は個別確認を選択してください。'],
    experience3: ['可证明的相关职历达到 3 年后，可能进入首个职历加分区间。', '証明可能な関連実務経験が3年に達すると、最初の職歴加点区分に入る可能性があります。'],
    income400: ['30岁以下且预计年收达到 400 万日元时，年收项目可能增加 10 分。', '30歳未満で予定年収400万円以上の場合、年収項目で10点の可能性があります。'],
    multipleDegrees: ['如持有不同专业领域的多个硕士、博士或专业职学位，可核对 5 分加分。', '異なる分野の修士・博士・専門職学位を複数保有する場合、5点加算を確認できます。'],
    educationReview: ['学历选择为“其他或不确定”，当前未计学历分。请准备毕业证和学位证进行人工确认。', '学歴が「その他・不明」のため学歴点は未加算です。卒業証明書と学位証明書を準備してください。'],
    activityReview: ['先确认预定工作本身是否属于所选活动类型；积分达标不能替代在留资格活动审查。', '予定業務が選択した活動類型に該当するか確認してください。点数だけでは活動該当性を満たしません。'],
  }
  return labels[key]?.[zh.value ? 0 : 1] ?? key
}
function ageBandLabel(band: HighlySkilledResult['ageBand']) {
  const labels: Record<HighlySkilledResult['ageBand'], [string, string]> = {
    under30: ['30岁以下区间', '30歳未満区分'],
    '30to34': ['30～34岁区间', '30～34歳区分'],
    '35to39': ['35～39岁区间', '35～39歳区分'],
    '40plus': ['40岁以上区间', '40歳以上区分'],
  }
  return labels[band][zh.value ? 0 : 1]
}
function reviewLabel(flag: string) {
  const labels: Record<string, [string, string]> = {
    education: ['学历与学位证明', '学歴・学位証明'],
    university: ['毕业院校加分资格', '卒業大学の加点対象'],
    activity: ['活动符合性', '活動該当性'],
    evidence: ['加分证明材料', '加点の立証資料'],
  }
  return labels[flag]?.[zh.value ? 0 : 1] ?? flag
}
</script>

<template>
  <div class="page-surface calculator-page">
    <section class="calculator-hero">
      <div class="container calculator-hero-grid">
        <div>
          <span class="eyebrow">{{ copy.eyebrow }}</span><h1>{{ copy.title }}</h1><p>{{ copy.intro }}</p>
          <div class="detail-tags">
            <el-tag type="success" effect="light" round>{{ copy.available }}</el-tag>
            <span><el-icon><Clock /></el-icon>{{ copy.duration }}</span>
            <span><el-icon><DocumentChecked /></el-icon>{{ copy.privacy }}</span>
          </div>
        </div>
        <aside class="rule-card">
          <span>{{ copy.source }}</span>
          <p>{{ zh ? '普通积分制达到70分后，仍须审查活动、年收和证明材料。' : '70点以上でも活動、年収、立証資料の審査が必要です。' }}</p>
          <a :href="officialSources.highlySkilled.url" target="_blank" rel="noopener noreferrer">{{ copy.official }}<el-icon><ArrowRight /></el-icon></a>
        </aside>
      </div>
    </section>

    <section class="section calculator-section"><div class="container calculator-shell">
      <el-steps :active="activeStep" finish-status="success" align-center class="calculator-steps">
        <el-step v-for="step in copy.steps" :key="step" :title="step" />
      </el-steps>

      <div v-if="activeStep === 0" class="calculator-panel">
        <div class="panel-heading"><span>01</span><div><h2>{{ zh ? '选择在日本主要从事的工作' : '日本で行う主な仕事を選択' }}</h2><p>{{ zh ? '先按实际工作内容选择，制度名称仅作为辅助。' : '実際の仕事内容から選び、制度名は補足として確認してください。' }}</p></div></div>
        <div class="activity-options">
          <label v-for="option in activities" :key="option.value" class="activity-option rich" :class="{ selected: form.activity === option.value }">
            <input v-model="form.activity" type="radio" name="activity" :value="option.value">
            <span class="activity-icon">{{ option.icon }}</span>
            <span><strong>{{ option.title }}</strong><small>{{ option.desc }}</small><em>{{ option.tag }}</em></span>
          </label>
        </div>
        <div class="calculator-actions end"><el-button type="primary" size="large" @click="nextStep">{{ copy.next }}<el-icon class="el-icon--right"><ArrowRight /></el-icon></el-button></div>
      </div>

      <div v-else-if="activeStep === 1" class="calculator-panel">
        <div class="panel-heading"><span>02</span><div><h2>{{ zh ? '填写本人及计算条件' : '本人情報と計算条件を入力' }}</h2><p>{{ copy.privacy }}</p></div></div>
        <el-form label-position="top" class="calculator-form">
          <div class="form-grid">
            <el-form-item :label="copy.name" required><el-input v-model="form.name" maxlength="80" show-word-limit /></el-form-item>
            <el-form-item :label="copy.phone" required><el-input v-model="form.phone" maxlength="30" inputmode="tel" placeholder="+81 90-1234-5678" /></el-form-item>
            <el-form-item :label="copy.birth" required><el-date-picker v-model="form.birthDate" type="date" value-format="YYYY-MM-DD" format="YYYY/MM/DD" :disabled-date="(d: Date) => disabledDate(d, true)" /></el-form-item>
            <el-form-item :label="copy.diagnosis" required><el-date-picker v-model="form.diagnosisDate" type="date" value-format="YYYY-MM-DD" format="YYYY/MM/DD" :disabled-date="(d: Date) => disabledDate(d)" /></el-form-item>
          </div>
          <div v-if="age >= 0" class="calculated-age">{{ zh ? `基准日周岁：${age}岁` : `基準日の満年齢：${age}歳` }}</div>
          <div class="form-grid">
            <el-form-item :label="copy.income" required><el-input :model-value="incomeText" inputmode="decimal" autocomplete="off" placeholder="400" @input="updateIncome" @blur="formatIncome" /><span class="field-unit simple">{{ zh ? '万日元' : '万円' }}</span><p class="field-help">{{ copy.incomeHelp }} {{ zh ? '以万日元输入，例如 400 表示 4,000,000 日元；可输入 0.1。' : '万円単位で入力します。400 は 4,000,000円を表し、0.1まで入力できます。' }}</p></el-form-item>
            <el-form-item :label="copy.experience" required><el-input :model-value="experienceText" inputmode="numeric" autocomplete="off" @input="updateExperience" @blur="formatExperience" /><span class="field-unit simple">{{ zh ? '完整年' : '満年' }}</span><p class="field-help">{{ zh ? '仅填写与申请活动直接相关、能够用在职或离职证明说明的完整年数。' : '申請活動に直接関連し、在職・退職証明で立証できる満年数を入力してください。' }}</p></el-form-item>
          </div>
          <el-form-item :label="copy.education">
            <el-radio-group v-model="form.education" class="education-radio-list">
              <el-radio v-for="option in educationOptions" :key="option.value" :value="option.value">
                <span class="education-radio-copy"><strong>{{ option.label }}</strong><small v-if="option.value === 'professional_degree' || option.value === 'other'">{{ option.desc }}</small></span>
              </el-radio>
            </el-radio-group>
          </el-form-item>
          <div class="form-grid">
            <el-form-item v-if="form.activity !== 'management'">
              <template #label>
                <span class="label-with-tip">{{ copy.research }}
                  <HelpPopover
                    :label="zh ? '查看研究成果要求' : '研究実績の要件を確認'"
                    :title="copy.research"
                    :content="zh
                      ? '可申报项目包括：作为发明人取得1项以上专利；入境前参加3次以上外国政府资助或竞争性资金研究；在 Scopus、PubMed 等数据库收录期刊发表3篇以上论文；或经法务大臣认可的其他同等成果。仅投稿、未授权专利、普通公司内部研究或无法提交证明的成果不能确认。选择后先列为待确认分，需准备专利、资助决定、论文检索或等效认定材料。'
                      : '発明者としての特許1件以上、入国前の外国政府補助金・競争的資金による研究3回以上、Scopus・PubMed等に収録された学術雑誌の論文3本以上、または法務大臣が認める同等実績が対象です。投稿のみ、未登録特許、通常の社内研究、立証不能な実績は確認できません。選択時は確認待ち点とし、特許・採択・論文検索等の資料が必要です。'"
                    :source-url="officialSources.research.url"
                    :source-label="zh ? '查看入管局积分表中的研究成果要求' : '入管庁ポイント表の研究実績要件を確認'"
                  />
                </span>
              </template>
              <el-select v-model="form.researchAchievements"><el-option :label="zh ? '无可确认项目' : '該当なし'" :value="0" /><el-option :label="zh ? '符合1项官方研究成果' : '公式基準に1項目該当'" :value="1" /><el-option :label="zh ? '符合2项及以上' : '2項目以上該当'" :value="2" /></el-select>
              <a class="official-inline-link" :href="officialSources.research.url" target="_blank" rel="noopener noreferrer">{{ zh ? '查看入管局积分表中的研究成果要求 ↗' : '入管庁ポイント表の研究実績要件を確認 ↗' }}</a>
            </el-form-item>
            <el-form-item v-if="form.activity === 'professional'">
              <template #label>
                <span class="label-with-tip">{{ copy.qualification }}
                  <HelpPopover
                    :label="zh ? '查看日本国家资格要求' : '日本の国家資格の要件を確認'"
                    :title="copy.qualification"
                    :content="zh
                      ? '须为日本国家资格或官方认可考试，且与将在日本从事的工作直接相关；例如从事信息处理工作时符合范围的信息处理技术者考试。每项5分、最多2项。民间证书、公司内部认证、外国资格或与工作无关的资格不在本项计算。选择后先列为待确认分，申请时须提交资格证书并说明与职务的关联。'
                      : '日本の国家資格・公的試験で、日本で従事する業務に直接関連するものが対象です。例：情報処理業務に対応する対象範囲の情報処理技術者試験。1件5点、最大2件です。民間・社内認定、外国資格、業務と無関係な資格は対象外です。選択時は確認待ち点とし、資格証明と職務との関連説明が必要です。'"
                    :source-url="officialSources.japaneseQualification.url"
                    :source-label="zh ? '查看入管局积分表中的国家资格要求' : '入管庁ポイント表の国家資格要件を確認'"
                  />
                </span>
              </template>
              <el-select v-model="form.qualificationCount"><el-option :label="zh ? '无' : 'なし'" :value="0" /><el-option :label="zh ? '1项' : '1件'" :value="1" /><el-option :label="zh ? '2项及以上（最多计2项）' : '2件以上（最大2件）'" :value="2" /></el-select>
              <a class="official-inline-link" :href="officialSources.japaneseQualification.url" target="_blank" rel="noopener noreferrer">{{ zh ? '查看入管局积分表中的国家资格要求 ↗' : '入管庁ポイント表の国家資格要件を確認 ↗' }}</a>
            </el-form-item>
            <el-form-item v-if="form.activity === 'management'" :label="zh ? '经营管理职位' : '経営・管理上の地位'"><el-select v-model="form.managementPosition"><el-option v-for="option in positionOptions" :key="option.value" :label="zh ? option.zh : option.ja" :value="option.value" /></el-select></el-form-item>
          </div>
          <div class="base-confirm"><el-checkbox v-model="form.baseActivityConfirmed">{{ copy.baseConfirm }}</el-checkbox></div>
        </el-form>
        <div class="calculator-actions"><el-button size="large" @click="previousStep"><el-icon><ArrowLeft /></el-icon>{{ copy.previous }}</el-button><el-button type="primary" size="large" @click="nextStep">{{ copy.next }}<el-icon><ArrowRight /></el-icon></el-button></div>
      </div>

      <div v-else-if="activeStep === 2" class="calculator-panel">
        <div class="panel-heading"><span>03</span><div><h2>{{ zh ? '确认可证明的加分项目' : '証明できる加点項目を確認' }}</h2><p>{{ zh ? '复杂项目旁的问号可查看判断边界。' : '複雑な項目は「？」で判断範囲を確認できます。' }}</p></div></div>
        <el-form label-position="top">
          <el-form-item :label="zh ? '日语能力' : '日本語能力'">
            <el-select v-model="form.japaneseLevel"><el-option v-for="item in japaneseOptions" :key="item.value" :value="item.value" :label="zh ? item.zh : item.ja" /></el-select>
            <a class="official-inline-link" :href="officialSources.japaneseLanguage.url" target="_blank" rel="noopener noreferrer">{{ zh ? '查看入管厅认可的日语能力范围 ↗' : '入管庁が認める日本語能力一覧を確認 ↗' }}</a>
          </el-form-item>
          <div class="bonus-option japanese-degree-option">
            <el-checkbox v-model="form.japaneseUniversity" />
            <span>
              <strong>{{ zh ? '是否在日本的高等教育机构取得学位？' : '日本の高等教育機関で学位を取得しましたか？' }}
                <HelpPopover
                  :label="zh ? '查看日本高等教育机构学位说明' : '日本の高等教育機関の学位について確認'"
                  :title="zh ? '日本高等教育机构学位' : '日本の高等教育機関の学位'"
                  :content="zh
                    ? '这是独立的用户确认项目。请仅在您确实由日本的大学、大学院或其他符合规则的高等教育机构取得学位时勾选。下方学校名单查询只判断大学名单加分，选择日本或非日本学校都不会自动修改此勾选。'
                    : '独立した本人確認項目です。日本の大学・大学院その他対象となる高等教育機関で実際に学位を取得した場合のみ選択してください。下の大学一覧検索は大学一覧加点だけを判定し、日本・海外の大学を選んでもこの選択は変わりません。'"
                />
              </strong>
              <small>{{ zh ? '勾选后按待确认项目计入10分；与N2/BJT 400档不可重复，N1/BJT 480档不受此排除。' : '選択時は確認待ち10点。N2・BJT 400区分とは重複不可ですが、N1・BJT 480区分は除外されません。' }}</small>
            </span>
          </div>
          <UniversitySelector v-model="form.university" :locale="settings.locale" :education-allows-bonus="educationAllowsBonus" />
          <div class="bonus-grid">
            <div v-for="bonus in bonusOptions" :key="bonus.key" class="bonus-option" :class="{ disabled: bonus.key === 'innovationSme' && !form.innovationOrganization }">
              <el-checkbox v-model="form[bonus.key]" :disabled="(bonus.key === 'innovationSme' && !form.innovationOrganization) || (bonus.key === 'multipleDegrees' && !educationAllowsBonus)" />
              <span>
                <strong>{{ bonus.title }}
                  <HelpPopover
                    :label="zh ? `查看${bonus.title}补充说明` : `${bonus.title}の補足を確認`"
                    :title="bonus.title"
                    :content="bonus.help"
                    :source-url="bonus.sourceUrl"
                    :source-label="zh ? '查看入管厅官方要求' : '入管庁の公式要件を確認'"
                  />
                </strong>
                <small>{{ bonus.description }}</small>
                <a class="official-inline-link" :href="bonus.sourceUrl" target="_blank" rel="noopener noreferrer">{{ zh ? '查看入管厅官方要求 ↗' : '入管庁の公式要件を確認 ↗' }}</a>
              </span>
            </div>
          </div>
        </el-form>
        <div class="calculator-actions"><el-button size="large" @click="previousStep"><el-icon><ArrowLeft /></el-icon>{{ copy.previous }}</el-button><el-button type="primary" size="large" @click="calculate">{{ copy.calculate }}<el-icon><ArrowRight /></el-icon></el-button></div>
      </div>

      <div v-else-if="result" ref="resultSection" class="calculator-result">
        <div class="result-summary" :class="{ passed: result.meetsPointThreshold }"><div class="score-ring"><strong>{{ result.confirmedTotal }}</strong><span>{{ zh ? '确定分' : '確定点' }}</span></div><div><span class="result-kicker">{{ copy.result }}</span><h2>{{ result.meetsPointThreshold ? copy.pass : copy.fail }}</h2><p>{{ zh ? '待确认分' : '確認待ち' }}：{{ result.pendingTotal }} · {{ zh ? '最高可能分' : '最大見込点' }}：{{ result.maximumTotal }}</p><p>{{ zh ? '70分' : '70点' }}：{{ result.meetsPointThreshold ? '✓' : (result.maximumMeetsPointThreshold ? '△' : '—') }} · {{ zh ? '80分' : '80点' }}：{{ result.confirmedMeets80 ? '✓' : (result.maximumMeets80 ? '△' : '—') }}</p><p v-if="!result.meetsPointThreshold">{{ copy.missing }} {{ result.missingPoints }} {{ copy.points }}</p><el-tag :type="result.preliminaryEligible ? 'success' : 'warning'" round>{{ result.preliminaryEligible ? copy.preliminaryPass : copy.preliminaryReview }}</el-tag></div></div>
        <section class="result-chart-grid">
          <ScoreProgressChart :confirmed="result.confirmedTotal" :pending="result.pendingTotal" :locale="settings.locale" />
          <ScoreBreakdownChart :rows="resultCategoryChart" :locale="settings.locale" />
        </section>
        <section class="applicant-summary">
          <div><span>{{ copy.name }}</span><strong>{{ form.name }}</strong></div><div><span>{{ copy.birth }}</span><strong>{{ form.birthDate.replace(/-/g, '/') }}</strong></div><div><span>{{ copy.diagnosis }}</span><strong>{{ form.diagnosisDate.replace(/-/g, '/') }}</strong></div><div><span>{{ zh ? '预计年收入' : '予定年収' }}</span><strong>{{ formatIncomeManYen(form.annualIncome) }}{{ zh ? '万日元' : '万円' }}</strong></div><div><span>{{ zh ? '计算年龄 / 年龄积分区间' : '満年齢 / 年齢点区分' }}</span><strong>{{ form.age }} {{ zh ? '岁' : '歳' }} · {{ ageBandLabel(result.ageBand) }}</strong></div>
        </section>
        <div v-if="!result.meetsIncomeRequirement || !result.baseActivityConfirmed || result.reviewFlags.length" class="result-alerts">
          <div v-if="!result.meetsIncomeRequirement" class="result-alert warning"><el-icon><WarningFilled /></el-icon><span>{{ copy.incomeFail }}</span></div>
          <div v-if="!result.baseActivityConfirmed" class="result-alert warning"><el-icon><WarningFilled /></el-icon><span>{{ copy.baseFail }}</span></div>
          <div v-if="result.reviewFlags.length" class="result-alert warning"><el-icon><WarningFilled /></el-icon><span>{{ copy.review }}：{{ result.reviewFlags.map(reviewLabel).join(' / ') }}</span></div>
        </div>
        <section class="breakdown-card"><h3>{{ copy.breakdown }}</h3><div class="score-list"><div v-for="item in result.items" :key="item.key"><span><el-icon><Check /></el-icon>{{ itemLabel(item.key) }} <el-tag size="small" :type="item.status === 'confirmed' ? 'success' : item.status === 'pending' ? 'warning' : 'info'">{{ item.status === 'confirmed' ? (zh ? '确定' : '確定') : item.status === 'pending' ? (zh ? '待确认' : '確認待ち') : (zh ? '因排除关系未计入' : '重複不可のため未加点') }}</el-tag></span><strong>{{ item.status === 'excluded' ? '0' : `+${item.points}` }} {{ copy.points }}</strong></div></div><div class="score-total"><span>{{ zh ? '确定分 / 最高可能分' : '確定点 / 最大見込点' }}</span><strong>{{ result.confirmedTotal }} / {{ result.maximumTotal }} {{ copy.points }}</strong></div></section>
        <section class="suggestion-card"><h3>{{ copy.suggestions }}</h3><div v-for="suggestion in result.suggestions" :key="suggestion.key" class="suggestion-item"><el-tag :type="suggestion.priority === 'high' ? 'warning' : 'info'" effect="light">{{ suggestion.potentialPoints ? `+${suggestion.potentialPoints}` : (zh ? '重要' : '重要') }}</el-tag><p>{{ suggestionText(suggestion.key) }}</p></div></section>
        <router-link class="jskip-related-link" to="/tools/j-skip">{{ copy.jskipLink }}<el-icon><ArrowRight /></el-icon></router-link>
        <section class="result-disclaimer"><el-icon><InfoFilled /></el-icon><div><h3>{{ zh ? '结果使用说明' : '結果の取り扱い' }}</h3><p>{{ zh ? '本结果是基于输入内容的自我检查，不构成许可保证或法律意见。最终由出入国在留管理厅审查。' : '入力内容に基づくセルフチェックであり、許可保証や法的助言ではありません。最終判断は出入国在留管理庁が行います。' }}</p></div></section>
        <div class="calculator-actions center"><el-button size="large" @click="reset"><el-icon><Refresh /></el-icon>{{ copy.reset }}</el-button><el-button type="primary" size="large" @click="createReport"><el-icon><DocumentChecked /></el-icon>{{ copy.report }}</el-button></div>
      </div>
    </div></section>

    <el-dialog v-model="reportVisible" class="report-dialog" :title="zh ? '高度人才积分诊断报告预览' : '高度人材ポイント診断レポート・プレビュー'" width="min(1100px, 96vw)" append-to-body>
      <div class="report-page-background"><DiagnosisReportView v-if="report" :key="report.locale" :report="report" /></div>
      <template #footer>
        <div class="report-actions">
          <el-button @click="reportVisible = false">{{ zh ? '关闭' : '閉じる' }}</el-button>
          <el-button type="primary" @click="printReport">{{ zh ? '打印 / 另存为PDF' : '印刷 / PDFとして保存' }}</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
