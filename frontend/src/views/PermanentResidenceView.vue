<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight, Check, Clock, DocumentChecked, InfoFilled, Refresh } from '@element-plus/icons-vue'
import { useSettingsStore } from '@/stores/settings'
import HelpPopover from '@/components/HelpPopover.vue'
import { officialSources } from '@/data/officialSources'
import { calculatePermanentResidence, requiredContinuousYears } from '@/utils/permanentResidenceCalculator'
import { formatInteger, MAX_EXPERIENCE_YEARS, parseIntegerInput } from '@/utils/numericInput'
import type { HighlySkilledPointsBand, PermanentResidenceInput, PermanentResidenceResult, ResidenceRoute } from '@/types/permanentResidence'

type FormModel = PermanentResidenceInput & { name: string; phone: string }

const settings = useSettingsStore()
const activeStep = ref(0)
const result = ref<PermanentResidenceResult | null>(null)
const resultSection = ref<HTMLElement>()

const totalYearsText = ref('')
const qualifyingYearsText = ref('')
const marriageYearsText = ref('')
const continuousResidenceText = ref('')
const highlySkilledYearsText = ref('')

const initialForm = (): FormModel => ({
  name: '',
  phone: '',
  route: 'general',
  goodConductConfirmed: false,
  independentLivelihoodConfirmed: false,
  publicDutiesConfirmed: false,
  noPenaltyConfirmed: false,
  holdsMaxPeriodStatus: false,
  totalYearsInJapan: null,
  qualifyingWorkOrResidenceYears: null,
  marriageYears: null,
  continuousResidenceYears: null,
  highlySkilledPoints: null,
  highlySkilledQualifyingYears: null,
})
const form = reactive<FormModel>(initialForm())

const zh = computed(() => settings.locale === 'zh-CN')
const waivesConductAndLivelihood = computed(() => form.route === 'spouse' || form.route === 'child')

const copy = computed(() => zh.value ? {
  eyebrow: '永住许可制度',
  title: '永住申请条件诊断',
  intro: '按出入国在留管理厅永住许可指南，独立判断在留年限、素行、独立生计、公共义务等基础条件。本工具不使用高度人才积分合计。',
  available: '可使用', duration: '约 5～8 分钟', privacy: '输入仅保存在当前页面，不发送、不保存',
  source: '规则版本：2026年7月（依据令和8年2月24日改订指南）', official: '查看入管厅永住许可指南',
  steps: ['选择永住路径', '填写年限与基础条件', '诊断结果'],
  next: '下一步', previous: '上一步', calculate: '查看诊断结果',
  name: '姓名', phone: '电话号码', phoneOptional: '（选填）',
  validation: '请完整填写姓名和本步骤的必填年限项目。',
  result: '永住条件诊断结果', pass: '基础条件初步符合', fail: '基础条件尚未全部符合',
  reset: '重新诊断',
  disclaimerTitle: '结果使用说明',
  disclaimerBody: '本工具根据您填写和勾选的内容进行机械判断，不代表入管厅的最终审查结果。永住许可需要提交证明材料，并由入管厅综合审查素行、生活状况、纳税及社会保险记录等全部情况后决定，具体是否符合、材料是否充分，建议由专业人员逐项核实。',
} : {
  eyebrow: '永住許可制度',
  title: '永住許可要件診断',
  intro: '出入国在留管理庁の永住許可ガイドラインに基づき、在留年数、素行、独立生計、公的義務などの基礎要件を独立して判定します。高度人材ポイントの合計点は使用しません。',
  available: '利用可能', duration: '約5～8分', privacy: '入力はこのページ内のみ・送信も保存もしません',
  source: 'ルール版：2026年7月（令和８年２月２４日改訂ガイドラインに基づく）', official: '入管庁の永住許可ガイドラインを見る',
  steps: ['永住経路を選択', '在留年数と基礎要件を入力', '診断結果'],
  next: '次へ', previous: '戻る', calculate: '診断結果を見る',
  name: '氏名', phone: '電話番号', phoneOptional: '（任意）',
  validation: '氏名と本ステップの必須項目を入力してください。',
  result: '永住要件診断結果', pass: '基礎要件を初期的に満たしています', fail: '基礎要件をすべて満たしていません',
  reset: 'もう一度診断する',
  disclaimerTitle: '結果の取り扱い',
  disclaimerBody: '本ツールは入力・選択内容に基づく機械的な判定であり、入管庁の最終判断ではありません。永住許可は証明資料の提出のうえ、素行、生活状況、納税・社会保険の記録等を総合的に審査して決定されます。該当性や資料の充足状況は専門スタッフにご確認ください。',
})

const routes = computed<Array<{ value: ResidenceRoute; icon: string; title: string; desc: string; tag: string }>>(() => zh.value ? [
  { value: 'general', icon: '般', title: '一般永住（就劳或居住资格）', desc: '以技术・人文知识・国际业务、经营管理、教授等就劳资格或居住资格为基础的通常路径。', tag: '连续在留10年，其中就劳/居住资格连续满5年' },
  { value: 'spouse', icon: '偶', title: '日本人・永住者・特别永住者的配偶者', desc: '与日本人、永住者或特别永住者维持实质婚姻生活的配偶。', tag: '婚姻生活实质持续满3年，且连续在留满1年' },
  { value: 'child', icon: '子', title: '日本人・永住者・特别永住者的实子', desc: '日本人、永住者或特别永住者的亲生子女或特别养子。', tag: '连续在留满1年' },
  { value: 'longTermResident', icon: '定', title: '定住者', desc: '目前以定住者在留资格在日本生活的人员。', tag: '以定住者资格连续在留满5年' },
  { value: 'highlySkilled', icon: '高', title: '高度人才（积分70分以上/80分以上）', desc: '持有高度专门职或特定活动（高度人才）在留资格，且积分达到规定门槛。', tag: '70分以上连续3年，或80分以上连续1年' },
  { value: 'jSkip', icon: 'J', title: '特别高度人才J-Skip', desc: '已按J-Skip制度获得认定的特别高度人才。', tag: '连续在留满1年' },
] : [
  { value: 'general', icon: '般', title: '一般永住（就労・居住資格）', desc: '技術・人文知識・国際業務、経営・管理、教授等の就労資格または居住資格による通常の経路。', tag: '継続在留10年、うち就労・居住資格で継続5年' },
  { value: 'spouse', icon: '偶', title: '日本人・永住者・特別永住者の配偶者', desc: '日本人、永住者又は特別永住者と実体を伴った婚姻生活を営む配偶者。', tag: '婚姻生活が実体を伴い3年以上継続し、かつ継続1年以上在留' },
  { value: 'child', icon: '子', title: '日本人・永住者・特別永住者の実子', desc: '日本人、永住者又は特別永住者の実子又は特別養子。', tag: '継続1年以上在留' },
  { value: 'longTermResident', icon: '定', title: '定住者', desc: '現在「定住者」の在留資格で生活している方。', tag: '定住者として継続5年以上在留' },
  { value: 'highlySkilled', icon: '高', title: '高度人材（70点以上・80点以上）', desc: '高度専門職又は特定活動（高度人材）の在留資格で、規定のポイントに達している方。', tag: '70点以上で継続3年、又は80点以上で継続1年' },
  { value: 'jSkip', icon: 'J', title: '特別高度人材J-Skip', desc: 'J-Skip制度により認定された特別高度人材。', tag: '継続1年以上在留' },
])

const highlySkilledPointsOptions: Array<{ value: HighlySkilledPointsBand; zh: string; ja: string }> = [
  { value: 'ge80', zh: '80分以上', ja: '80点以上' },
  { value: 'from70to79', zh: '70～79分', ja: '70～79点' },
  { value: 'below70', zh: '70分以下', ja: '70点未満' },
]

const continuousResidenceLabel = computed(() => {
  const required = requiredContinuousYears(form.route)
  const map: Record<ResidenceRoute, [string, string]> = {
    general: ['', ''],
    spouse: ['连续在留年数', '継続在留年数'],
    child: ['连续在留年数', '継続在留年数'],
    longTermResident: ['以定住者资格连续在留年数', '定住者としての継続在留年数'],
    highlySkilled: ['', ''],
    jSkip: ['连续在留年数（特定活动/高度专门职）', '継続在留年数（特定活動・高度専門職）'],
  }
  const [zhLabel, jaLabel] = map[form.route]
  return zh.value ? `${zhLabel}（需满足${required}年）` : `${jaLabel}（${required}年以上必要）`
})

function updateYears(kind: 'total' | 'qualifying' | 'marriage' | 'continuous' | 'highlySkilled', value: string) {
  const parsed = parseIntegerInput(value, MAX_EXPERIENCE_YEARS)
  if (kind === 'total') { form.totalYearsInJapan = parsed; totalYearsText.value = parsed === null ? '' : value }
  if (kind === 'qualifying') { form.qualifyingWorkOrResidenceYears = parsed; qualifyingYearsText.value = parsed === null ? '' : value }
  if (kind === 'marriage') { form.marriageYears = parsed; marriageYearsText.value = parsed === null ? '' : value }
  if (kind === 'continuous') { form.continuousResidenceYears = parsed; continuousResidenceText.value = parsed === null ? '' : value }
  if (kind === 'highlySkilled') { form.highlySkilledQualifyingYears = parsed; highlySkilledYearsText.value = parsed === null ? '' : value }
}
function formatYears(kind: 'total' | 'qualifying' | 'marriage' | 'continuous' | 'highlySkilled') {
  if (kind === 'total') totalYearsText.value = formatInteger(form.totalYearsInJapan)
  if (kind === 'qualifying') qualifyingYearsText.value = formatInteger(form.qualifyingWorkOrResidenceYears)
  if (kind === 'marriage') marriageYearsText.value = formatInteger(form.marriageYears)
  if (kind === 'continuous') continuousResidenceText.value = formatInteger(form.continuousResidenceYears)
  if (kind === 'highlySkilled') highlySkilledYearsText.value = formatInteger(form.highlySkilledQualifyingYears)
}

function validRouteFields(): boolean {
  switch (form.route) {
    case 'general':
      return form.totalYearsInJapan !== null && form.qualifyingWorkOrResidenceYears !== null
    case 'spouse':
      return form.marriageYears !== null && form.continuousResidenceYears !== null
    case 'child':
    case 'longTermResident':
    case 'jSkip':
      return form.continuousResidenceYears !== null
    case 'highlySkilled':
      return form.highlySkilledPoints !== null && form.highlySkilledQualifyingYears !== null
    default:
      return false
  }
}
function validBase(): boolean {
  return form.name.trim().length > 0 && form.name.trim().length <= 80
    && (form.phone.trim().length === 0 || (form.phone.trim().length >= 7 && form.phone.trim().length <= 30))
    && validRouteFields()
}

function nextStep() {
  activeStep.value = Math.min(1, activeStep.value + 1)
  document.querySelector('.calculator-shell')?.scrollIntoView({ behavior: 'smooth' })
}
function previousStep() { activeStep.value = Math.max(0, activeStep.value - 1) }
async function calculate() {
  if (!validBase()) return ElMessage.warning(copy.value.validation)
  form.name = form.name.trim()
  form.phone = form.phone.trim()
  result.value = calculatePermanentResidence({
    route: form.route,
    goodConductConfirmed: form.goodConductConfirmed,
    independentLivelihoodConfirmed: form.independentLivelihoodConfirmed,
    publicDutiesConfirmed: form.publicDutiesConfirmed,
    noPenaltyConfirmed: form.noPenaltyConfirmed,
    holdsMaxPeriodStatus: form.holdsMaxPeriodStatus,
    totalYearsInJapan: form.totalYearsInJapan,
    qualifyingWorkOrResidenceYears: form.qualifyingWorkOrResidenceYears,
    marriageYears: form.marriageYears,
    continuousResidenceYears: form.continuousResidenceYears,
    highlySkilledPoints: form.highlySkilledPoints,
    highlySkilledQualifyingYears: form.highlySkilledQualifyingYears,
  })
  activeStep.value = 2
  await nextTick()
  resultSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
function reset() {
  Object.assign(form, initialForm())
  totalYearsText.value = ''
  qualifyingYearsText.value = ''
  marriageYearsText.value = ''
  continuousResidenceText.value = ''
  highlySkilledYearsText.value = ''
  result.value = null
  activeStep.value = 0
}

function itemLabel(key: string) {
  const labels: Record<string, [string, string]> = {
    goodConduct: ['素行善良（遵守法律法规，日常生活未受社会谴责）', '素行善良（法令遵守、社会的に非難されない生活）'],
    independentLivelihood: ['独立生计（资产或技能足以稳定生活）', '独立生計（資産・技能により安定した生活が見込める）'],
    publicDuties: ['公共义务履行（纳税・养老金・医疗保险・入管申报）', '公的義務の履行（納税・年金・医療保険・入管届出）'],
    noPenalty: ['无罚金刑或拘禁刑记录', '罰金刑・拘禁刑の記録なし'],
    maxPeriodStatus: ['持有该资格类别下最长在留期间', '在留資格の最長の在留期間を保持'],
    residenceDuration: [durationLabel(form.route, true), durationLabel(form.route, false)],
  }
  return labels[key]?.[zh.value ? 0 : 1] ?? key
}
function durationLabel(route: ResidenceRoute, isZh: boolean) {
  const map: Record<ResidenceRoute, [string, string]> = {
    general: ['在留年限（10年+5年）', '在留年数（10年＋5年）'],
    spouse: ['婚姻与在留年限（3年+1年）', '婚姻・在留年数（3年＋1年）'],
    child: ['连续在留年限（1年）', '継続在留年数（1年）'],
    longTermResident: ['定住者连续在留年限（5年）', '定住者としての継続在留年数（5年）'],
    highlySkilled: ['积分对应连续在留年限', 'ポイントに応じた継続在留年数'],
    jSkip: ['连续在留年限（1年）', '継続在留年数（1年）'],
  }
  return map[route][isZh ? 0 : 1]
}
function statusText(item: { met: boolean; waived: boolean }) {
  if (item.waived) return zh.value ? '该路径无需满足' : 'この経路では不要'
  return item.met ? (zh.value ? '满足' : '充足') : (zh.value ? '尚未满足' : '未充足')
}
function suggestionText(key: string) {
  const missingYears = result.value?.missingYears ?? 0
  const route = result.value?.route ?? form.route
  const labels: Record<string, [string, string]> = {
    goodConduct: ['请核对是否存在可能影响素行善良判断的记录；如有疑问建议由专业人员核实。', '素行善良の判断に影響し得る記録がないかご確認ください。ご不明な場合は専門スタッフにご相談ください。'],
    independentLivelihood: ['请核对当前资产、收入或职业技能是否足以证明稳定的生活基础，不依赖生活保护等公共补助。', '現在の資産・収入・職業技能が安定した生活の基盤として十分か、生活保護等の公的扶助に依存していないかご確認ください。'],
    publicDuties: ['请核对税金、养老金、医疗保险是否存在欠缴，以及入管法规定的各项申报是否按时完成；欠缴记录通常会被从严评价。', '税金・年金・医療保険料の未納がないか、入管法上の届出等が期限内に行われているかご確認ください。未納の記録は厳しく評価される傾向にあります。'],
    noPenalty: ['请核对是否存在罚金刑或拘禁刑记录；一般交通违章的行政罚款通常不计入，如有疑问建议由专业人员核实。', '罰金刑・拘禁刑の記録がないかご確認ください。一般的な交通反則金は通常含まれませんが、ご不明な場合は専門スタッフにご確認ください。'],
    maxPeriodStatus: ['请在下次更新在留期间时申请该资格类别下的最长期限，再考虑提交永住申请。', '次回の在留期間更新時に、その在留資格で取得可能な最長の期間を申請したうえで、永住許可申請をご検討ください。'],
    highlySkilledPointsTooLow: ['当前积分未达到70分，暂不能通过高度人才路径缩短所需连续在留年限；可以核对是否符合一般永住的10年路径，或使用高度人才积分计算工具查看能否提升积分。', '現在のポイントは70点未満のため、高度人材の経路による在留年数の緩和は適用されません。一般永住の10年要件に該当するか、または高度人材ポイント計算ツールでポイントを増やせないか確認してください。'],
    prepareEvidence: ['基础条件已初步符合，请准备在留卡、税金和住民税的课税・纳税证明、养老金和健康保险缴纳记录、身元保证书等材料，具体必要材料请以入管厅公布的清单为准。', '基礎要件を初期的に満たしています。在留カード、税金・住民税の課税・納税証明、年金・健康保険の納付記録、身元保証書等をご準備ください。必要書類は入管庁公表の一覧でご確認ください。'],
  }
  if (key === 'residenceDuration') {
    const routeText: Record<ResidenceRoute, [string, string]> = {
      general: [`距离10年连续居住及5年就劳/居住资格要求，预计还需要 ${missingYears} 年（以较大缺口计算）。`, `継続10年の在留及び5年の就労・居住資格要件まで、あと${missingYears}年ほど必要です（差が大きい方で算出）。`],
      spouse: [`距离3年婚姻生活及1年连续在留要求，预计还需要 ${missingYears} 年。`, `3年の婚姻生活及び1年の継続在留要件まで、あと${missingYears}年ほど必要です。`],
      child: [`距离1年连续在留要求，还需要 ${missingYears} 年。`, `1年の継続在留要件まで、あと${missingYears}年必要です。`],
      longTermResident: [`距离定住者身份5年连续在留要求，还需要 ${missingYears} 年。`, `定住者として5年の継続在留要件まで、あと${missingYears}年必要です。`],
      highlySkilled: [`按当前积分水平，距离所需连续在留年限还需要 ${missingYears} 年。`, `現在のポイント区分では、必要な継続在留年数まであと${missingYears}年です。`],
      jSkip: [`距离1年连续在留要求，还需要 ${missingYears} 年。`, `1年の継続在留要件まで、あと${missingYears}年必要です。`],
    }
    return routeText[route][zh.value ? 0 : 1]
  }
  return labels[key]?.[zh.value ? 0 : 1] ?? key
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
          <p>{{ zh ? '永住许可需要综合审查全部条件与证明材料，本工具结果仅供初步参考。' : '永住許可はすべての要件と証明資料を総合的に審査して決定されます。本ツールの結果は初期参考にとどまります。' }}</p>
          <a :href="officialSources.permanentResidenceGuideline.url" target="_blank" rel="noopener noreferrer">{{ copy.official }}<el-icon><ArrowRight /></el-icon></a>
        </aside>
      </div>
    </section>

    <section class="section calculator-section"><div class="container calculator-shell">
      <el-steps :active="activeStep" finish-status="success" align-center class="calculator-steps">
        <el-step v-for="step in copy.steps" :key="step" :title="step" />
      </el-steps>

      <div v-if="activeStep === 0" class="calculator-panel">
        <div class="panel-heading"><span>01</span><div><h2>{{ zh ? '选择符合您情况的永住路径' : 'ご自身の状況に合う永住経路を選択' }}</h2><p>{{ zh ? '不确定时可先选择最接近的路径，结果页会说明适用条件。' : '不明な場合はもっとも近い経路を選んでください。結果ページで適用条件を確認できます。' }}</p></div></div>
        <div class="activity-options">
          <label v-for="option in routes" :key="option.value" class="activity-option rich" :class="{ selected: form.route === option.value }">
            <input v-model="form.route" type="radio" name="route" :value="option.value">
            <span class="activity-icon">{{ option.icon }}</span>
            <span><strong>{{ option.title }}</strong><small>{{ option.desc }}</small><em>{{ option.tag }}</em></span>
          </label>
        </div>
        <div class="calculator-actions end"><el-button type="primary" size="large" @click="nextStep">{{ copy.next }}<el-icon class="el-icon--right"><ArrowRight /></el-icon></el-button></div>
      </div>

      <div v-else-if="activeStep === 1" class="calculator-panel">
        <div class="panel-heading"><span>02</span><div><h2>{{ zh ? '填写本人信息、在留年限和基础条件' : '本人情報・在留年数・基礎要件を入力' }}</h2><p>{{ copy.privacy }}</p></div></div>
        <el-form label-position="top" class="calculator-form">
          <div class="form-grid">
            <el-form-item :label="copy.name" required><el-input v-model="form.name" maxlength="80" show-word-limit /></el-form-item>
            <el-form-item><template #label>{{ copy.phone }}<span class="field-optional-tag">{{ copy.phoneOptional }}</span></template><el-input v-model="form.phone" maxlength="30" inputmode="tel" placeholder="+81 90-1234-5678" /></el-form-item>
          </div>

          <div v-if="form.route === 'general'" class="form-grid">
            <el-form-item :label="zh ? '在日本连续居住总年数' : '日本での継続在留年数（合計）'" required>
              <el-input :model-value="totalYearsText" inputmode="numeric" autocomplete="off" @input="updateYears('total', $event)" @blur="formatYears('total')" /><span class="field-unit simple">{{ zh ? '完整年' : '満年' }}</span>
            </el-form-item>
            <el-form-item required>
              <template #label>
                <span class="label-with-tip">{{ zh ? '其中以就劳/居住资格连续在留年数' : 'うち就労・居住資格による継続在留年数' }}
                  <HelpPopover
                    :label="zh ? '查看说明' : '説明を見る'"
                    :title="zh ? '就劳/居住资格连续在留年数' : '就労・居住資格による継続在留年数'"
                    :content="zh ? '技术・人文知识・国际业务、经营管理、教授、居住者等就劳或居住类在留资格下的连续在留年数。技能实习和特定技能1号期间不计入本项。' : '技術・人文知識・国際業務、経営・管理、教授、居住者等の就労資格・居住資格による継続在留年数です。技能実習及び特定技能1号の期間は含まれません。'"
                    :source-url="officialSources.permanentResidenceGuideline.url"
                    :source-label="zh ? '查看入管厅永住许可指南' : '入管庁の永住許可ガイドラインを見る'"
                  />
                </span>
              </template>
              <el-input :model-value="qualifyingYearsText" inputmode="numeric" autocomplete="off" @input="updateYears('qualifying', $event)" @blur="formatYears('qualifying')" /><span class="field-unit simple">{{ zh ? '完整年' : '満年' }}</span>
            </el-form-item>
          </div>

          <div v-else-if="form.route === 'spouse'" class="form-grid">
            <el-form-item :label="zh ? '实质婚姻生活持续年数' : '実体を伴った婚姻生活の継続年数'" required>
              <el-input :model-value="marriageYearsText" inputmode="numeric" autocomplete="off" @input="updateYears('marriage', $event)" @blur="formatYears('marriage')" /><span class="field-unit simple">{{ zh ? '完整年' : '満年' }}</span>
            </el-form-item>
            <el-form-item :label="zh ? '在日本连续在留年数' : '日本での継続在留年数'" required>
              <el-input :model-value="continuousResidenceText" inputmode="numeric" autocomplete="off" @input="updateYears('continuous', $event)" @blur="formatYears('continuous')" /><span class="field-unit simple">{{ zh ? '完整年' : '満年' }}</span>
            </el-form-item>
          </div>

          <div v-else-if="form.route === 'child' || form.route === 'longTermResident' || form.route === 'jSkip'" class="form-grid">
            <el-form-item :label="continuousResidenceLabel" required>
              <el-input :model-value="continuousResidenceText" inputmode="numeric" autocomplete="off" @input="updateYears('continuous', $event)" @blur="formatYears('continuous')" /><span class="field-unit simple">{{ zh ? '完整年' : '満年' }}</span>
            </el-form-item>
          </div>

          <div v-else-if="form.route === 'highlySkilled'" class="form-grid">
            <el-form-item :label="zh ? '目前或过去积分水平' : '現在または過去のポイント区分'" required>
              <el-select v-model="form.highlySkilledPoints"><el-option v-for="option in highlySkilledPointsOptions" :key="option.value" :label="zh ? option.zh : option.ja" :value="option.value" /></el-select>
            </el-form-item>
            <el-form-item :label="zh ? '以该积分水平连续在留年数' : 'その区分での継続在留年数'" required>
              <el-input :model-value="highlySkilledYearsText" inputmode="numeric" autocomplete="off" @input="updateYears('highlySkilled', $event)" @blur="formatYears('highlySkilled')" /><span class="field-unit simple">{{ zh ? '完整年' : '満年' }}</span>
            </el-form-item>
          </div>

          <div class="base-confirm" v-if="!waivesConductAndLivelihood">
            <el-checkbox v-model="form.goodConductConfirmed">{{ zh ? '我遵守法律法规，日常生活中作为居民没有受到社会谴责的行为（素行善良）' : '法令を遵守し、日常生活において住民として社会的に非難されることのない生活を営んでいます（素行善良）' }}</el-checkbox>
            <el-checkbox v-model="form.independentLivelihoodConfirmed">{{ zh ? '我的资产或职业技能足以维持稳定生活，不会仅依赖生活保护等公共补助（独立生计）' : '資産又は職業技能により安定した生活が見込め、生活保護等の公的扶助のみに依存していません（独立生計）' }}</el-checkbox>
          </div>
          <div class="base-confirm">
            <el-checkbox v-model="form.publicDutiesConfirmed">{{ zh ? '我已按时缴纳所得税、住民税等税金，养老金保险费和医疗保险费，并按规定完成入管法要求的各项申报' : '所得税・住民税等の税金、年金保険料及び医療保険料を期限内に納付し、入管法上の届出等の義務を履行しています' }}</el-checkbox>
            <el-checkbox v-model="form.noPenaltyConfirmed">
              {{ zh ? '我过去没有被判处罚金刑或拘禁刑（一般交通违章的行政罚款除外）' : '罰金刑又は拘禁刑を受けたことはありません（一般的な交通反則金を除く）' }}
              <HelpPopover
                :label="zh ? '查看说明' : '説明を見る'"
                :title="zh ? '罚金刑・拘禁刑' : '罰金刑・拘禁刑'"
                :content="zh ? '这里指经法院判决的罚金刑（如略式命令）或拘禁刑（原懲役・禁锢），不包括一般交通违章的行政性反则金。是否构成罚金刑以上处罚需以判决书为准，如有疑问建议咨询专业人员。' : 'ここでいう罰金刑（略式命令等）・拘禁刑（旧懲役・禁錮）は裁判所の判決によるものを指し、一般的な交通反則金は含まれません。該当するかどうかは判決内容によるため、ご不明な場合は専門スタッフにご確認ください。'"
              />
            </el-checkbox>
            <el-checkbox v-model="form.holdsMaxPeriodStatus">
              {{ zh ? '我目前持有的在留资格，已经是该资格类别下可以获得的最长在留期间' : '現在の在留資格について、その資格で取得可能な最長の在留期間をもって在留しています' }}
              <HelpPopover
                :label="zh ? '查看说明' : '説明を見る'"
                :title="zh ? '最长在留期间' : '最長の在留期間'"
                :content="zh ? '例如高度专门职、技术・人文知识・国际业务等资格通常最长可获得5年在留期间；如果您目前持有的是较短的1年或3年期间，建议先在续签时申请最长期间，再提交永住申请。' : '例えば高度専門職や技術・人文知識・国際業務等では最長5年の在留期間が定められています。現在1年や3年など短い期間をお持ちの場合は、更新時に最長期間を申請したうえで永住許可申請をご検討ください。'"
              />
            </el-checkbox>
          </div>
        </el-form>
        <div class="calculator-actions"><el-button size="large" @click="previousStep"><el-icon><ArrowLeft /></el-icon>{{ copy.previous }}</el-button><el-button type="primary" size="large" @click="calculate">{{ copy.calculate }}<el-icon><ArrowRight /></el-icon></el-button></div>
      </div>

      <div v-else-if="result" ref="resultSection" class="calculator-result">
        <div class="result-status" :class="{ success: result.eligible }">
          <el-icon><Check v-if="result.eligible" /><InfoFilled v-else /></el-icon>
          <div><span>{{ copy.result }}</span><h2>{{ result.eligible ? copy.pass : copy.fail }}</h2></div>
        </div>
        <div class="criteria-list">
          <div v-for="item in result.items" :key="item.key" :class="{ met: item.met || item.waived }">
            <el-icon><Check /></el-icon><span>{{ itemLabel(item.key) }}</span><strong>{{ statusText(item) }}</strong>
          </div>
        </div>
        <section class="suggestion-card"><h3>{{ zh ? '改善与准备建议' : '改善・準備の提案' }}</h3><div v-for="key in result.suggestions" :key="key" class="suggestion-item"><el-tag :type="result.eligible ? 'info' : 'warning'" effect="light">{{ zh ? '重要' : '重要' }}</el-tag><p>{{ suggestionText(key) }}</p></div></section>
        <section class="result-disclaimer"><el-icon><InfoFilled /></el-icon><div><h3>{{ copy.disclaimerTitle }}</h3><p>{{ copy.disclaimerBody }}</p></div></section>
        <div class="calculator-actions center"><el-button size="large" @click="reset"><el-icon><Refresh /></el-icon>{{ copy.reset }}</el-button></div>
      </div>
    </div></section>
  </div>
</template>
