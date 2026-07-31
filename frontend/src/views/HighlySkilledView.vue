<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
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
import { trackEvent } from '@/utils/analytics'
import { calculateJSkip } from '@/utils/jSkipCalculator'
import {
  formatIncomeManYen, formatInteger, MAX_EXPERIENCE_YEARS,
  parseIncomeManYenInput, parseIntegerInput,
} from '@/utils/numericInput'
import type {
  DiagnosisReport, EducationLevel, HighlySkilledInput,
  HighlySkilledResult, JapaneseLevel, ManagementPosition,
} from '@/types/highlySkilled'
import type { JSkipResult } from '@/types/jSkip'

type FormModel = Omit<HighlySkilledInput, 'age' | 'annualIncome' | 'experienceYears'> & {
  age: number
  annualIncome: number | null
  experienceYears: number | null
}

const settings = useSettingsStore()
const activeStep = ref(0)
const result = ref<HighlySkilledResult | null>(null)
const jSkipResult = ref<JSkipResult | null>(null)
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

onMounted(() => trackEvent({ type: 'tool_view', toolId: 'highly-skilled' }))

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
  university: { countryCode: 'JP', universityId: null, searchText: '' },
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
  name: '姓名', phone: '电话号码', phoneOptional: '（选填）', birth: '出生日期', diagnosis: '诊断基准日',
  income: '预计年收入', incomeHelp: '填写在日本从事拟申请活动可获得的税前预计年收入。', experience: '相关工作年限',
  education: '主要学历', research: '研究成果', qualification: '与职务相关的日本国家资格',
  result: '积分计算结果', pass: '达到 70 分积分门槛', pass80: '达到 80 分积分门槛', fail: '尚未达到 70 分积分门槛',
  preliminaryPass: '初步判断：符合', preliminaryReview: '初步判断：基础条件未满足',
  breakdown: '积分明细', suggestions: '改善与准备建议', report: '生成诊断报告',
  reset: '重新计算', total: '总积分', missing: '距离门槛还差',
  baseConfirm: '我已确认拟从事活动符合对应就劳在留资格的活动范围和基础条件',
  validation: '请完整填写姓名、有效出生日期、诊断基准日、年收入和相关工作年限。',
  incomeFail: '1号イ、ロ原则上还需满足年收 300 万日元以上的最低年收基准。',
  baseFail: '尚未确认基础活动符合性，不能仅凭积分判断符合。',
  jskipTitle: '您可能同时符合特别高度人才 J-Skip',
  jskipNote: '按您已填写的活动类型、学历或职历、年收入判断，您已同时满足J-Skip的基础条件。J-Skip不使用70分积分门槛，与上方积分完全独立、不计入总分，可作为另一条可能更快的申请路径了解。',
  jskipOfficialLink: '查看入管厅J-Skip说明',
  jskipDisclaimer: '该结果不包含积分，不代表许可决定。学历、职历、年收及活动内容均需以申请材料证明，并由入管厅最终审查。',
} : {
  eyebrow: '高度人材ポイント制',
  title: '高度人材ポイント計算',
  intro: '入管庁の公開ポイント表に基づき、1号イ・ロ・ハを計算します。J-Skipとは完全に分離しています。',
  available: '利用可能', duration: '約7～10分', privacy: '入力はこのページ内のみ・送信も保存もしません',
  source: 'ルール版：2026年7月', official: '入管庁のポイント制度を見る',
  steps: ['活動類型', '本人・基本条件', '加点項目', '計算結果'],
  next: '次へ', previous: '戻る', calculate: 'ポイントを計算', points: '点',
  name: '氏名', phone: '電話番号', phoneOptional: '（任意）', birth: '生年月日', diagnosis: '診断基準日',
  income: '予定年収', incomeHelp: '申請する活動により日本で受ける税引前の予定年収を入力してください。', experience: '関連実務経験',
  education: '主な学歴', research: '研究実績', qualification: '職務に関連する日本の国家資格',
  result: 'ポイント計算結果', pass: '70点の基準に到達', pass80: '80点の基準に到達', fail: '70点の基準に未到達',
  preliminaryPass: '初期判断：該当可能性あり', preliminaryReview: '初期判断：基礎条件を満たしていません',
  breakdown: 'ポイント内訳', suggestions: '改善・準備の提案', report: '診断レポートを生成',
  reset: 'もう一度計算', total: '合計ポイント', missing: '基準まであと',
  baseConfirm: '予定する活動が対応する就労資格の活動範囲と基礎要件を満たすことを確認しました',
  validation: '氏名、有効な生年月日、診断基準日、年収、実務経験を入力してください。',
  incomeFail: '1号イ・ロでは原則として年収300万円以上の最低年収基準も必要です。',
  baseFail: '活動該当性が未確認のため、ポイントだけでは判断できません。',
  jskipTitle: '特別高度人材 J-Skip にも該当する可能性があります',
  jskipNote: '入力済みの活動類型、学歴または職歴、年収から判断すると、J-Skipの基礎要件も同時に満たしています。J-Skipは70点の基準を使わず、上記のポイントとは完全に独立しており合計点には含まれません。より早く進められる可能性がある別ルートとしてご確認ください。',
  jskipOfficialLink: '入管庁のJ-Skip説明を見る',
  jskipDisclaimer: 'ポイント計算ではなく、許可判断でもありません。学歴、職歴、年収、活動内容は資料で立証し、入管庁の審査を受ける必要があります。',
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
    professional_degree: ['専門職学位', '法令に基づく専門職学位。申請時には証明書が必要です。'],
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
  | 'japaneseUniversity'
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
    key: 'japaneseUniversity',
    title: zh.value ? '日本高等教育机构学位' : '日本の高等教育機関の学位',
    description: zh.value ? '在日本的高等教育机构取得学位（10分）' : '日本の高等教育機関で学位を取得（10点）',
    help: zh.value
      ? '请仅在您确实从日本的大学、大学院或其他符合规则的高等教育机构取得学位时勾选。该项目与N2/BJT 400分档不可重复；选择N2时本项会被清除并停用。N1/BJT 480分档可与本项同时计分。'
      : '日本の大学・大学院その他対象となる高等教育機関で実際に学位を取得した場合のみ選択してください。N2・BJT 400点区分とは重複できず、N2選択時は本項目が解除・無効になります。N1・BJT 480点区分とは同時加点できます。',
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
watch(() => form.japaneseLevel, (value) => {
  if (value === 'n2') form.japaneseUniversity = false
})
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
    && (form.phone.trim().length === 0 || (form.phone.trim().length >= 7 && form.phone.trim().length <= 30))
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
  jSkipResult.value = calculateJSkip({
    activity: form.activity,
    education: form.education,
    experienceYears: form.experienceYears as number,
    annualIncome: (form.annualIncome as number) / 10_000,
    baseActivityConfirmed: form.baseActivityConfirmed,
  })
  report.value = null
  activeStep.value = 3
  trackEvent({ type: 'tool_complete', toolId: 'highly-skilled' })
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
function printReport() {
  const el = document.querySelector('.diagnosis-report') as HTMLElement | null
  if (el) {
    const previousZoom = el.style.getPropertyValue('zoom')
    const previousWidth = el.style.width
    el.classList.add('report-print-compact')
    el.style.setProperty('zoom', '1')
    el.style.width = '703px'
    const naturalHeight = el.scrollHeight
    el.style.width = previousWidth
    const targetHeight = 1040
    const scale = naturalHeight > targetHeight ? Math.max(0.6, targetHeight / naturalHeight) : 1
    el.style.setProperty('zoom', String(scale))
    window.addEventListener('afterprint', function restore() {
      el.classList.remove('report-print-compact')
      if (previousZoom) el.style.setProperty('zoom', previousZoom)
      else el.style.removeProperty('zoom')
    }, { once: true })
  }
  window.print()
}
function reset() {
  Object.assign(form, initialForm())
  incomeText.value = ''
  experienceText.value = ''
  result.value = null
  jSkipResult.value = null
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
    prepareEvidence: ['恭喜，积分已经达标！接下来请把学历、工作经历、年收入和其他加分项目的证明文件都准备齐全，因为最终能不能通过还是要看材料能否证明这些内容。', 'おめでとうございます、基準点に到達しました！次は学歴・職歴・年収やその他の加点項目の証明書類を揃えましょう。最終的には資料で証明できるかどうかがポイントになります。'],
    japaneseN2: ['如果您有JLPT N2或同等日语能力证明（比如BJT商务日语考试400分以上），补充这一项可以多加10分，记得以合格证书为准。', 'JLPT N2やBJT400点以上など同等の日本語能力証明をお持ちなら、この項目を追加することで10点増える可能性があります。合格証明書が必要です。'],
    japaneseN1Upgrade: ['现在是按N2档位计分的。如果您实际已经达到N1水平（或BJT 480分以上），可以再确认一下能不能升到更高档位加分。', '現在はN2区分で計算しています。もしN1、またはBJT480点以上をお持ちでしたら、より高い区分で加点できないか確認してみてください。'],
    gapTo80: [`按目前情况，您距离80分还差 ${result.value?.pointsTo80 ?? 0} 分。达到80分能获得更多签证方面的优待，可以看看还有哪些项目能补充。`, `現在の状況では、80点まであと${result.value?.pointsTo80 ?? 0}点です。80点に到達するとさらに優遇が受けられるので、追加できる項目がないか見てみましょう。`],
    qualificationReview: ['可以看看您从事的工作是否需要用到日本的国家资格证书，如果有相关的记得补充上，最多能加两项（每项5分）。', 'ご担当予定の業務に日本の国家資格が必要かどうか確認してみてください。関連する資格があれば追加でき、最大2件（1件5点）まで加点されます。'],
    researchEvidence: ['您填写的研究成果已经算进总分了，正式申请时记得准备好专利证书、科研经费的批准文件或论文检索记录等证明材料。', '入力いただいた研究実績はすでに合計点に反映されています。申請時には特許証明、研究費採択通知、論文検索結果などの資料を準備しておきましょう。'],
    japaneseDegreeN2Exclusion: ['日语N2和“在日本获得学位”这两项不能同时加分，系统已经按对您更有利的N2来计算了。', 'JLPT N2と「日本での学位取得」は同時に加点できないため、より有利なN2の方で計算しています。'],
    japaneseDegreeSelection: ['如果您确实是在日本的大学或研究生院毕业并拿到学位的，记得勾选这一项，可以额外加10分。', '実際に日本の大学や大学院で学位を取得された場合は、この項目にチェックを入れると10点追加されます。'],
    verifyUniversity: ['系统里没有搜索到您的学校，请用毕业证书上的官方英文校名再搜一次；如果最终还是没有匹配上，这次就没办法加院校分了。', '該当する学校が見つかりませんでした。卒業証明書に記載された正式な英語表記でもう一度検索してください。それでも一致しない場合、今回は大学の加点対象になりません。'],
    experience3: ['相关工作经验只要能证明达到3年，就能开始拿到职历加分，可以留意一下年限是否已经足够。', '関連する実務経験が3年に達すると、職歴の加点が始まります。年数が足りているか確認してみてください。'],
    income400: ['如果您不到30岁，并且年收入能达到400万日元以上，这一项就能多加10分。', '30歳未満で年収400万円以上であれば、この項目でさらに10点加算されます。'],
    multipleDegrees: ['如果您有两个不同专业领域的硕士、博士或专业职学位，可以确认一下是否符合额外加5分的条件。', '分野の異なる修士・博士・専門職学位を2つ以上お持ちの場合、追加で5点加点できるか確認してみてください。'],
    educationReview: ['您目前学历选的是“其他或不确定”，这样是不计学历分的。请拿出毕业证和学位证书核对一下，再重新选择对应的学历。', '現在、学歴は「その他・不明」になっており、学歴の点数は加算されていません。卒業証明書・学位記をご確認のうえ、該当する学歴を選び直してください。'],
    activityReview: ['在看积分之前，请先确认您准备从事的工作内容确实符合所选的活动类型，光靠分数达标是不够的。', '点数を確認する前に、まずご予定の業務内容が選んだ活動類型に本当に当てはまるか確認してください。点数が足りていても、それだけでは不十分です。'],
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
            <el-form-item><template #label>{{ copy.phone }}<span class="field-optional-tag">{{ copy.phoneOptional }}</span></template><el-input v-model="form.phone" maxlength="30" inputmode="tel" placeholder="+81 90-1234-5678" /></el-form-item>
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
                      ? '可申报项目包括：作为发明人取得1项以上专利；入境前参加3次以上外国政府资助或竞争性资金研究；在 Scopus、PubMed 等数据库收录期刊发表3篇以上论文；或经法务大臣认可的其他同等成果。仅投稿、未授权专利、普通公司内部研究或无法提交证明的成果不能计入。选择后会计入预计总分，正式申请时需准备专利、资助决定、论文检索或等效认定材料。'
                      : '発明者としての特許1件以上、入国前の外国政府補助金・競争的資金による研究3回以上、Scopus・PubMed等に収録された学術雑誌の論文3本以上、または法務大臣が認める同等実績が対象です。投稿のみ、未登録特許、通常の社内研究、立証不能な実績は算入できません。選択内容は予想ポイントに算入され、申請時には特許・採択・論文検索等の資料が必要です。'"
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
                      ? '须为日本国家资格或官方认可考试，且与将在日本从事的工作直接相关；例如从事信息处理工作时符合范围的信息处理技术者考试。每项5分、最多2项。民间证书、公司内部认证、外国资格或与工作无关的资格不在本项计算。选择后会计入预计总分，申请时须提交资格证书并说明与职务的关联。'
                      : '日本の国家資格・公的試験で、日本で従事する業務に直接関連するものが対象です。例：情報処理業務に対応する対象範囲の情報処理技術者試験。1件5点、最大2件です。民間・社内認定、外国資格、業務と無関係な資格は対象外です。選択内容は予想ポイントに算入され、申請時には資格証明と職務との関連説明が必要です。'"
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
          <UniversitySelector v-model="form.university" :locale="settings.locale" :education-allows-bonus="educationAllowsBonus" />
          <div class="bonus-grid">
            <div v-for="bonus in bonusOptions" :key="bonus.key" class="bonus-option" :class="{ disabled: (bonus.key === 'innovationSme' && !form.innovationOrganization) || (bonus.key === 'japaneseUniversity' && form.japaneseLevel === 'n2') }">
              <el-checkbox v-model="form[bonus.key]" :disabled="(bonus.key === 'innovationSme' && !form.innovationOrganization) || (bonus.key === 'multipleDegrees' && !educationAllowsBonus) || (bonus.key === 'japaneseUniversity' && form.japaneseLevel === 'n2')" />
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
                <small v-if="bonus.key === 'japaneseUniversity' && form.japaneseLevel === 'n2'" class="field-help">{{ zh ? '已选择N2档：按规则优先计入N2的10分，本项不可同时选择。' : 'N2区分を選択中のため、N2の10点を優先し、本項目は同時に選択できません。' }}</small>
                <a class="official-inline-link" :href="bonus.sourceUrl" target="_blank" rel="noopener noreferrer">{{ zh ? '查看入管厅官方要求 ↗' : '入管庁の公式要件を確認 ↗' }}</a>
              </span>
            </div>
          </div>
        </el-form>
        <div class="calculator-actions"><el-button size="large" @click="previousStep"><el-icon><ArrowLeft /></el-icon>{{ copy.previous }}</el-button><el-button type="primary" size="large" @click="calculate">{{ copy.calculate }}<el-icon><ArrowRight /></el-icon></el-button></div>
      </div>

      <div v-else-if="result" ref="resultSection" class="calculator-result">
        <div class="result-summary" :class="{ passed: result.reaches70, passed80: result.reaches80 }"><div class="score-ring"><strong>{{ result.totalPoints }}</strong><span>{{ zh ? '预计总分' : '予想ポイント' }}</span></div><div><span class="result-kicker">{{ copy.result }}</span><h2>{{ result.reaches80 ? copy.pass80 : result.reaches70 ? copy.pass : copy.fail }}</h2><p>{{ zh ? '70分' : '70点' }}：{{ result.reaches70 ? '✓' : `— ${result.pointsTo70}${copy.points}` }} · {{ zh ? '80分' : '80点' }}：{{ result.reaches80 ? '✓' : `— ${result.pointsTo80}${copy.points}` }}</p><p v-if="!result.reaches70">{{ copy.missing }} {{ result.pointsTo70 }} {{ copy.points }}</p><el-tag :type="result.preliminaryEligible ? 'success' : 'warning'" round>{{ result.preliminaryEligible ? copy.preliminaryPass : copy.preliminaryReview }}</el-tag></div></div>
        <section class="result-chart-grid">
          <ScoreProgressChart :total="result.totalPoints" :locale="settings.locale" />
          <ScoreBreakdownChart :rows="resultCategoryChart" :locale="settings.locale" />
        </section>
        <section class="applicant-summary">
          <div><span>{{ copy.name }}</span><strong>{{ form.name }}</strong></div><div><span>{{ copy.birth }}</span><strong>{{ form.birthDate.replace(/-/g, '/') }}</strong></div><div><span>{{ copy.diagnosis }}</span><strong>{{ form.diagnosisDate.replace(/-/g, '/') }}</strong></div><div><span>{{ zh ? '预计年收入' : '予定年収' }}</span><strong>{{ formatIncomeManYen(form.annualIncome) }}{{ zh ? '万日元' : '万円' }}</strong></div><div><span>{{ zh ? '计算年龄 / 年龄积分区间' : '満年齢 / 年齢点区分' }}</span><strong>{{ form.age }} {{ zh ? '岁' : '歳' }} · {{ ageBandLabel(result.ageBand) }}</strong></div>
        </section>
        <div v-if="!result.meetsIncomeRequirement || !result.baseActivityConfirmed" class="result-alerts">
          <div v-if="!result.meetsIncomeRequirement" class="result-alert warning"><el-icon><WarningFilled /></el-icon><span>{{ copy.incomeFail }}</span></div>
          <div v-if="!result.baseActivityConfirmed" class="result-alert warning"><el-icon><WarningFilled /></el-icon><span>{{ copy.baseFail }}</span></div>
        </div>
        <section class="breakdown-card"><h3>{{ copy.breakdown }}</h3><div class="score-list"><div v-for="item in result.items" :key="item.key"><span><el-icon><Check /></el-icon>{{ itemLabel(item.key) }} <el-tag size="small" :type="item.status === 'included' ? 'success' : 'info'">{{ item.status === 'included' ? (zh ? '已计入' : '算入済み') : item.status === 'excluded' ? (zh ? '因排除关系未计入' : '重複不可のため未加点') : (zh ? '未计入' : '未算入') }}</el-tag></span><strong>{{ item.status === 'included' ? `+${item.points}` : '0' }} {{ copy.points }}</strong></div></div><div class="score-total"><span>{{ zh ? '预计总分' : '予想ポイント' }}</span><strong>{{ result.totalPoints }} {{ copy.points }}</strong></div></section>
        <section class="suggestion-card"><h3>{{ copy.suggestions }}</h3><div v-for="suggestion in result.suggestions" :key="suggestion.key" class="suggestion-item"><el-tag :type="suggestion.priority === 'high' ? 'warning' : 'info'" effect="light">{{ suggestion.potentialPoints ? `+${suggestion.potentialPoints}` : (zh ? '重要' : '重要') }}</el-tag><p>{{ suggestionText(suggestion.key) }}</p></div></section>
        <section v-if="jSkipResult?.eligible" class="jskip-advisory">
          <div class="result-status success">
            <el-icon><Check /></el-icon>
            <div><span>J-Skip</span><h2>{{ copy.jskipTitle }}</h2></div>
          </div>
          <p class="jskip-advisory-note">{{ copy.jskipNote }}</p>
          <a class="official-inline-link" :href="officialSources.jSkip.url" target="_blank" rel="noopener noreferrer">{{ copy.jskipOfficialLink }} ↗</a>
          <p class="jskip-advisory-disclaimer">{{ copy.jskipDisclaimer }}</p>
        </section>
        <section class="result-disclaimer"><el-icon><InfoFilled /></el-icon><div><h3>{{ zh ? '结果使用说明' : '結果の取り扱い' }}</h3><p>{{ zh ? '本工具根据您填写和选择的内容计算预计积分。正式申请时，各项加分均需提交相应证明材料，并以出入国在留管理厅的最终审查结果为准。' : '本ツールは、入力・選択された内容に基づき予想ポイントを計算するものです。実際の申請時には、各加点項目について所定の証明資料を提出する必要があり、最終的な判断は出入国在留管理庁の審査によります。' }}</p></div></section>
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
