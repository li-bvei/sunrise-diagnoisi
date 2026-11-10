<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { trackEvent } from '@/utils/analytics'
import { calculatePurchaseYield } from '@/utils/purchaseYieldCalculator'
import { deletePurchaseScenario, listPurchaseScenarios, savePurchaseScenario } from '@/utils/purchaseScenarioApi'
import { downloadBlob } from '@/utils/csv'
import type { PurchaseYieldInput, PurchaseYieldScenario } from '@/types/purchaseYield'
import type { PropertyProfile } from '@/types/property'

const LEGACY_HISTORY_KEY = 'sunrise-purchase-yield-history'
const CURRENT_ID_KEY = 'purchase-yield-current-id'
const RULE_VERSION = '2024-07'
const settings = useSettingsStore()
const zh = computed(() => settings.locale === 'zh-CN')

const blankProperty = (): PropertyProfile => ({ name: '', address: '', station: '', walkMinutes: null, area: null, layout: '', buildingAge: null, managementFee: null })
const blankInput = (): PurchaseYieldInput => ({
  property: blankProperty(), priceManYen: null, monthlyRent: null, repairReserve: null,
  managementFeeTenantPays: true, brokerageMode: 'free', renovationCost: null,
  annualPropertyTax: null, monthlyRentalManagement: null, otherInitialCosts: null,
})
const exampleInput = (): PurchaseYieldInput => ({
  ...blankInput(),
  property: { ...blankProperty(), name: '示例物件 大阪市北区', area: 25.5, layout: '1K', managementFee: 5660 },
  priceManYen: 1180, monthlyRent: 55000, repairReserve: 9900,
})

const input = reactive<PurchaseYieldInput>(exampleInput())
const history = ref<PurchaseYieldScenario[]>([])
const currentId = ref<string | null>(null)
const pendingDelete = ref<string | null>(null)
const status = ref('')
const downloading = ref(false)
let saveTimer: ReturnType<typeof setTimeout> | null = null
let writeChain: Promise<unknown> = Promise.resolve()
let lastQueuedFingerprint = ''

const copy = computed(() => zh.value ? {
  inputTitle: '输入物件信息', hint: '右侧卡片实时更新，填写内容自动保存到历史记录。',
  name: '物件名称', area: '专有面积', layout: '格局', price: '房价（本体）', rent: '月租金',
  managementFee: '管理费（月）', tenantPays: '管理费由租客承担', repair: '修缮积立金（月）',
  brokerage: '中介手续费', free: '买方免付（0円）', include: '计入回报率（法定上限）', exclude: '另计，不计入回报率',
  renovation: '装修费用', optional: '以下选填，不填则不显示', tax: '固定资产税等（年）', rentalManagement: '管理委托费（月）', other: '其他初期费用',
  history: '历史记录', newProperty: '＋ 新建物件', empty: '还没有记录。填写物件名称和房价后会自动保存到这里。',
  loading: '正在读取历史记录…', saved: '已自动保存', saveError: '数据库保存失败，请重试', loadError: '读取历史记录失败', retry: '重试保存',
  editing: '编辑中', load: '载入', remove: '删除', confirmRemove: '确认删除', removed: '已删除', newReady: '已新建，填写物件名称和房价后自动保存',
  image: '保存为图片', imageLoading: '正在生成…', imageSaved: '图片已保存', imageError: '生成图片失败',
  report: '投资回报率测算', unnamed: '未命名物件', areaChip: '专有面积', layoutChip: '格局', pricePerArea: '㎡单价', rentPerArea: '租金',
  netYield: '实际净回报率', grossYield: '表面回报率', payback: '回本年限', initial: '初期投入', annual: '年度收支', details: '回报率明细',
  priceLabel: '房价（本体）', brokerageLabel: '中介手续费', feeFree: '卖主负担，买方免付', feeSeparate: '未计入回报率',
  renovationLabel: '装修费用', otherLabel: '其他初期费用', total: '合计', annualRent: '年租金', repairLabel: '修缮积立金',
  managementLabel: '管理费', tenantNote: '由租客承担', rentalManagementLabel: '租赁管理委托费', taxLabel: '固定资产税・都市计划税', annualNet: '年净收入',
  priceYield: '表面回报率（按房价）', allYield: '表面回报率（按总投入）', priceFormula: '年租金 ÷ 房价', allFormula: '年租金 ÷ 初期投入合计', netFormula: '年净收入 ÷ 初期投入合计', payFormula: '初期投入合计 ÷ 年净收入',
  date: '测算日', netHistory: '净回报',
} : {
  inputTitle: '物件情報を入力', hint: '右側のカードはリアルタイムで更新され、入力内容は履歴に自動保存されます。',
  name: '物件名', area: '専有面積', layout: '間取り', price: '物件価格（本体）', rent: '月額賃料',
  managementFee: '管理費（月）', tenantPays: '管理費は入居者負担', repair: '修繕積立金（月）',
  brokerage: '仲介手数料', free: '買主負担なし（0円）', include: '利回りに含める（法定上限）', exclude: '別途・利回りに含めない',
  renovation: 'リフォーム費用', optional: '以下は任意。未入力の場合は表示しません', tax: '固定資産税等（年）', rentalManagement: '賃貸管理委託料（月）', other: 'その他初期費用',
  history: '履歴', newProperty: '＋ 新規物件', empty: '履歴はありません。物件名と価格を入力すると自動保存されます。',
  loading: '履歴を読み込み中…', saved: '自動保存しました', saveError: 'データベースへの保存に失敗しました', loadError: '履歴を読み込めませんでした', retry: '再保存',
  editing: '編集中', load: '読込', remove: '削除', confirmRemove: '削除を確定', removed: '削除しました', newReady: '新規物件です。物件名と価格を入力すると自動保存されます',
  image: '画像を保存', imageLoading: '画像を作成中…', imageSaved: '画像を保存しました', imageError: '画像を作成できませんでした',
  report: '投資利回り試算', unnamed: '名称未設定の物件', areaChip: '専有面積', layoutChip: '間取り', pricePerArea: '㎡単価', rentPerArea: '賃料',
  netYield: '実質利回り', grossYield: '表面利回り', payback: '回収年数', initial: '初期投資', annual: '年間収支', details: '利回りの内訳',
  priceLabel: '物件価格（本体）', brokerageLabel: '仲介手数料', feeFree: '売主負担・買主負担なし', feeSeparate: '利回りに含めない',
  renovationLabel: 'リフォーム費用', otherLabel: 'その他初期費用', total: '合計', annualRent: '年間賃料', repairLabel: '修繕積立金',
  managementLabel: '管理費', tenantNote: '入居者負担', rentalManagementLabel: '賃貸管理委託料', taxLabel: '固定資産税・都市計画税', annualNet: '年間純収入',
  priceYield: '表面利回り（物件価格）', allYield: '表面利回り（初期投資合計）', priceFormula: '年間賃料 ÷ 物件価格', allFormula: '年間賃料 ÷ 初期投資合計', netFormula: '年間純収入 ÷ 初期投資合計', payFormula: '初期投資合計 ÷ 年間純収入',
  date: '試算日', netHistory: '実質利回り',
})

function calculatorLabels() {
  const c = copy.value
  return {
    propertyPrice: c.priceLabel, brokerageFee: c.brokerageLabel, brokerageSeparate: c.feeSeparate,
    brokerageFree: c.feeFree, renovation: c.renovationLabel, otherInitial: c.otherLabel,
    initialTotal: c.total, annualRent: c.annualRent, repairReserve: c.repairLabel,
    buildingManagement: c.managementLabel, tenantPays: c.tenantNote,
    rentalManagement: c.rentalManagementLabel, propertyTax: c.taxLabel, annualNet: c.annualNet,
    brokerageLimitNote: '',
  }
}

const result = computed(() => calculatePurchaseYield(input, calculatorLabels()))
const canSave = computed(() => input.property.name.trim().length > 0 && (input.priceManYen ?? 0) > 0)
const yen = (value: number) => `${Math.round(value).toLocaleString('ja-JP')}円`
const amount = (value: number) => value < 0 ? `−${yen(-value)}` : yen(value)
const percent = (value: number, hasBase = true) => hasBase && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : '—'
const netText = computed(() => percent(result.value.netYield, result.value.initialInvestment > 0))
const grossText = computed(() => percent(result.value.grossYieldOnPrice, result.value.propertyPrice > 0))
const paybackText = computed(() => result.value.paybackYears === null ? '—' : `${result.value.paybackYears.toFixed(1)}年`)
const today = computed(() => {
  const date = new Date(result.value.calculatedAt)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
})
const specs = computed(() => {
  const rows: string[] = []
  if (input.property.layout.trim()) rows.push(`${copy.value.layoutChip} ${input.property.layout.trim()}`)
  if (input.property.area) rows.push(`${copy.value.areaChip} ${input.property.area}㎡（${(input.property.area / 3.30578).toFixed(2)}坪）`)
  if (input.property.area && result.value.propertyPrice) rows.push(`${copy.value.pricePerArea} ${(result.value.propertyPrice / input.property.area / 10_000).toFixed(1)}万円`)
  if (input.property.area && input.monthlyRent) rows.push(`${copy.value.rentPerArea} ${Math.round(input.monthlyRent / input.property.area).toLocaleString('ja-JP')}円/㎡`)
  return rows
})
const reportMeta = computed(() => `${copy.value.price} ${(input.priceManYen ?? 0).toLocaleString('ja-JP')}万円 ・ ${copy.value.rent} ${yen(input.monthlyRent ?? 0)} ・ ${copy.value.date} ${today.value}`)
const initialRows = computed(() => result.value.initialLines.map((line) => {
  if (line.label !== copy.value.brokerageLabel) return line
  if (input.brokerageMode === 'include') {
    const note = result.value.propertyPrice <= 8_000_000
      ? (zh.value ? '800万円以下物件特例上限 30万円＋税' : '800万円以下の特例上限 30万円＋税')
      : (zh.value ? '（房价×3%＋6万）×1.1' : '（価格×3%＋6万円）×1.1')
    return { ...line, note }
  }
  return line.kind === 'additional' ? { ...line, label: `${zh.value ? '另计：' : '別途：'}${line.label}` } : line
}))
const annualRows = computed(() => result.value.annualLines.map((line) => {
  if (line.label === copy.value.annualRent) return { ...line, note: `${yen(input.monthlyRent ?? 0)} × 12` }
  if (line.label === copy.value.repairLabel) return { ...line, note: `${yen(input.repairReserve ?? 0)} × 12` }
  if (line.label === copy.value.managementLabel && (input.property.managementFee ?? 0) > 0) {
    return { ...line, note: input.managementFeeTenantPays ? `${yen(input.property.managementFee ?? 0)}/月，${copy.value.tenantNote}` : `${yen(input.property.managementFee ?? 0)} × 12` }
  }
  if (line.label === copy.value.rentalManagementLabel) return { ...line, note: `${yen(input.monthlyRentalManagement ?? 0)} × 12` }
  return line
}))
const metrics = computed(() => {
  const c = copy.value
  const rows = [{ label: c.priceYield, note: c.priceFormula, text: grossText.value }]
  if (result.value.initialInvestment !== result.value.propertyPrice) rows.push({ label: c.allYield, note: c.allFormula, text: percent(result.value.grossYieldOnInvestment, result.value.initialInvestment > 0) })
  rows.push({ label: c.netYield, note: c.netFormula, text: netText.value })
  rows.push({ label: c.payback, note: c.payFormula, text: paybackText.value })
  return rows
})

type NumericField = 'area' | 'managementFee' | 'priceManYen' | 'monthlyRent' | 'repairReserve' | 'renovationCost' | 'annualPropertyTax' | 'monthlyRentalManagement' | 'otherInitialCosts'
function setNumber(field: NumericField, event: Event) {
  const value = (event.target as HTMLInputElement).value
  const parsed = value === '' ? null : Number(value)
  if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) return
  if (field === 'area' || field === 'managementFee') input.property[field] = parsed
  else input[field] = parsed
}
function snapshot() { return JSON.parse(JSON.stringify(input)) as PurchaseYieldInput }
function fingerprint() { return JSON.stringify(input) }
function id() { return crypto.randomUUID() }
function dateTime(value: string) {
  const date = new Date(value)
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
function setCurrentId(value: string | null) {
  currentId.value = value
  if (value) localStorage.setItem(CURRENT_ID_KEY, value)
  else localStorage.removeItem(CURRENT_ID_KEY)
}
function applyScenario(scenario: PurchaseYieldScenario) {
  const loaded = JSON.parse(JSON.stringify(scenario.input)) as PurchaseYieldInput
  Object.assign(input, blankInput(), loaded, { property: { ...blankProperty(), ...loaded.property } })
  setCurrentId(scenario.id)
  pendingDelete.value = null
  lastQueuedFingerprint = `${scenario.id}:${fingerprint()}`
}

async function saveCurrent() {
  if (!canSave.value) return
  const key = fingerprint()
  const scenarioId = currentId.value ?? id()
  if (`${scenarioId}:${key}` === lastQueuedFingerprint) return writeChain
  setCurrentId(scenarioId)
  lastQueuedFingerprint = `${scenarioId}:${key}`
  const data = snapshot()
  const calculation = calculatePurchaseYield(data, calculatorLabels())
  status.value = zh.value ? '保存中…' : '保存中…'
  const task = writeChain.catch(() => undefined).then(() => savePurchaseScenario({
    id: scenarioId, input: data, calculation, ruleVersion: RULE_VERSION, netYield: calculation.initialInvestment > 0 ? calculation.netYield : null,
  }))
  writeChain = task
  try {
    const saved = await task
    history.value = [saved, ...history.value.filter((row) => row.id !== saved.id)].sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    status.value = `${copy.value.saved} ${dateTime(saved.savedAt).slice(11)}`
  } catch {
    lastQueuedFingerprint = ''
    status.value = copy.value.saveError
  }
}
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  if (!canSave.value) return
  saveTimer = setTimeout(() => { saveTimer = null; void saveCurrent() }, 1200)
}
async function flushSave() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; await saveCurrent() }
  await writeChain.catch(() => undefined)
}
async function loadScenario(scenario: PurchaseYieldScenario) {
  await flushSave()
  applyScenario(scenario)
  status.value = `${copy.value.load}：${scenario.input.property.name || copy.value.unnamed}`
}
async function newProperty() {
  await flushSave()
  Object.assign(input, blankInput())
  setCurrentId(null)
  pendingDelete.value = null
  lastQueuedFingerprint = ''
  status.value = copy.value.newReady
  document.getElementById('purchase-name')?.focus()
}
async function removeScenario(scenarioId: string) {
  if (pendingDelete.value !== scenarioId) { pendingDelete.value = scenarioId; return }
  await flushSave()
  try {
    await deletePurchaseScenario(scenarioId)
    history.value = history.value.filter((row) => row.id !== scenarioId)
    if (currentId.value === scenarioId) setCurrentId(null)
    pendingDelete.value = null
    status.value = copy.value.removed
  } catch { status.value = copy.value.saveError }
}

async function loadHistory() {
  try {
    history.value = await listPurchaseScenarios()
    const old = JSON.parse(localStorage.getItem(LEGACY_HISTORY_KEY) || '[]') as Array<{ id: string; input: PurchaseYieldInput; netYield?: number; savedAt?: string }>
    if (Array.isArray(old) && old.length) {
      const existing = new Set(history.value.map((row) => row.id))
      for (const row of old) {
        if (!row.input || !row.id || existing.has(row.id)) continue
        const calculation = calculatePurchaseYield(row.input, calculatorLabels())
        const saved = await savePurchaseScenario({ id: row.id, input: row.input, calculation, ruleVersion: RULE_VERSION, netYield: calculation.netYield, savedAt: row.savedAt })
        history.value.push(saved)
      }
      localStorage.removeItem(LEGACY_HISTORY_KEY)
      history.value.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    }
    const previousId = localStorage.getItem(CURRENT_ID_KEY)
    const previous = history.value.find((row) => row.id === previousId)
    if (previous) applyScenario(previous)
    else if (previousId) setCurrentId(null)
  } catch { status.value = copy.value.loadError }
}

async function saveImage() {
  const card = document.getElementById('purchase-report-card')
  if (!card) return
  downloading.value = true
  status.value = copy.value.imageLoading
  try {
    await document.fonts.ready
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(card, { scale: 2, backgroundColor: '#fff', logging: false })
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Image unavailable')), 'image/png'))
    const safeName = (input.property.name.trim() || '物件').replace(/[\\/:*?"<>|]/g, '_')
    downloadBlob(`${safeName}_回报率.png`, blob)
    status.value = copy.value.imageSaved
  } catch { status.value = copy.value.imageError }
  finally { downloading.value = false }
}

onMounted(() => {
  trackEvent({ type: 'tool_view', toolId: 'purchase-yield' })
  void loadHistory()
})
</script>

<template>
  <div class="purchase-page">
    <div class="purchase-wrap">
      <div class="left">
        <form class="form" autocomplete="off" @submit.prevent @input="scheduleSave" @change="scheduleSave">
          <h2>{{ copy.inputTitle }}</h2>
          <p class="hint">{{ copy.hint }}</p>
          <div class="field"><label for="purchase-name">{{ copy.name }}</label><div class="inp"><input id="purchase-name" v-model="input.property.name" type="text" maxlength="200"></div></div>
          <div class="field"><label for="purchase-area">{{ copy.area }}</label><div class="inp"><input id="purchase-area" :value="input.property.area ?? ''" type="number" inputmode="decimal" min="0" step="any" @input="setNumber('area', $event)"><span>㎡</span></div></div>
          <div class="field"><label for="purchase-layout">{{ copy.layout }}</label><div class="inp"><input id="purchase-layout" v-model="input.property.layout" type="text" maxlength="80"></div></div>
          <div class="field"><label for="purchase-price">{{ copy.price }}</label><div class="inp"><input id="purchase-price" :value="input.priceManYen ?? ''" type="number" inputmode="decimal" min="0" step="any" @input="setNumber('priceManYen', $event)"><span>万円</span></div></div>
          <div class="field"><label for="purchase-rent">{{ copy.rent }}</label><div class="inp"><input id="purchase-rent" :value="input.monthlyRent ?? ''" type="number" inputmode="numeric" min="0" @input="setNumber('monthlyRent', $event)"><span>円</span></div></div>
          <div class="field"><label for="purchase-management">{{ copy.managementFee }}</label><div class="inp"><input id="purchase-management" :value="input.property.managementFee ?? ''" type="number" inputmode="numeric" min="0" @input="setNumber('managementFee', $event)"><span>円</span></div></div>
          <label class="check"><input v-model="input.managementFeeTenantPays" type="checkbox"> {{ copy.tenantPays }}</label>
          <div class="field"><label for="purchase-repair">{{ copy.repair }}</label><div class="inp"><input id="purchase-repair" :value="input.repairReserve ?? ''" type="number" inputmode="numeric" min="0" @input="setNumber('repairReserve', $event)"><span>円</span></div></div>
          <div class="field"><label for="purchase-brokerage">{{ copy.brokerage }}</label><div class="inp"><select id="purchase-brokerage" v-model="input.brokerageMode"><option value="free">{{ copy.free }}</option><option value="include">{{ copy.include }}</option><option value="exclude">{{ copy.exclude }}</option></select></div></div>
          <div class="field"><label for="purchase-renovation">{{ copy.renovation }}</label><div class="inp"><input id="purchase-renovation" :value="input.renovationCost ?? ''" type="number" inputmode="numeric" min="0" placeholder="0" @input="setNumber('renovationCost', $event)"><span>円</span></div></div>
          <div class="sub">{{ copy.optional }}</div>
          <div class="field"><label for="purchase-tax">{{ copy.tax }}</label><div class="inp"><input id="purchase-tax" :value="input.annualPropertyTax ?? ''" type="number" inputmode="numeric" min="0" placeholder="0" @input="setNumber('annualPropertyTax', $event)"><span>円</span></div></div>
          <div class="field"><label for="purchase-rental-management">{{ copy.rentalManagement }}</label><div class="inp"><input id="purchase-rental-management" :value="input.monthlyRentalManagement ?? ''" type="number" inputmode="numeric" min="0" placeholder="0" @input="setNumber('monthlyRentalManagement', $event)"><span>円</span></div></div>
          <div class="field"><label for="purchase-other">{{ copy.other }}</label><div class="inp"><input id="purchase-other" :value="input.otherInitialCosts ?? ''" type="number" inputmode="numeric" min="0" placeholder="0" @input="setNumber('otherInitialCosts', $event)"><span>円</span></div></div>
        </form>

        <section class="hist" :aria-label="copy.history">
          <div class="hist-head"><h2>{{ copy.history }}</h2><button class="btn-s" type="button" @click="newProperty">{{ copy.newProperty }}</button></div>
          <p class="hist-msg" aria-live="polite">{{ status }} <button v-if="status === copy.saveError" class="btn-s" type="button" @click="saveCurrent">{{ copy.retry }}</button></p>
          <ul v-if="history.length" class="hist-list">
            <li v-for="row in history" :key="row.id" :class="{ cur: currentId === row.id }">
              <div class="hist-entry"><div class="t" :title="row.input.property.name">{{ row.input.property.name || copy.unnamed }}</div><div class="d">{{ row.input.priceManYen ?? 0 }}万円 ・ {{ copy.netHistory }} {{ row.netYield === null ? '—' : percent(row.netYield) }} ・ {{ dateTime(row.savedAt) }}</div></div>
              <div class="ops"><span v-if="currentId === row.id" class="tag">{{ copy.editing }}</span><button v-else class="btn-s" type="button" @click="loadScenario(row)">{{ copy.load }}</button><button class="btn-s danger" type="button" @click="removeScenario(row.id)">{{ pendingDelete === row.id ? copy.confirmRemove : copy.remove }}</button></div>
            </li>
          </ul>
          <p v-else class="hist-empty">{{ copy.empty }}</p>
        </section>
      </div>

      <div class="right">
        <div class="toolbar"><button class="btn" type="button" :disabled="downloading" @click="saveImage">{{ downloading ? copy.imageLoading : copy.image }}</button></div>
        <article id="purchase-report-card" class="card">
          <div class="card-head">
            <div class="eyebrow">{{ copy.report }}</div>
            <h1>{{ input.property.name.trim() || copy.unnamed }}</h1>
            <div v-if="specs.length" class="specs"><span v-for="item in specs" :key="item">{{ item }}</span></div>
            <div class="meta">{{ reportMeta }}</div>
          </div>
          <div class="card-body">
            <div class="hero"><div class="main"><div class="k">{{ copy.netYield }}</div><div class="v">{{ netText }}</div></div><div><div class="k">{{ copy.grossYield }}</div><div class="v">{{ grossText }}</div></div><div><div class="k">{{ copy.payback }}</div><div class="v">{{ paybackText }}</div></div></div>
            <div class="two">
              <section><h3>{{ copy.initial }}</h3><table><tbody><tr v-for="(line, index) in initialRows" :key="index" :class="{ total: line.kind === 'total', extra: line.kind === 'additional' }"><td>{{ line.label }}<span v-if="line.note" class="note">{{ line.note }}</span></td><td class="n" :class="{ neg: line.amount < 0 }">{{ amount(line.amount) }}</td></tr></tbody></table></section>
              <section><h3>{{ copy.annual }}</h3><table><tbody><tr v-for="(line, index) in annualRows" :key="index" :class="{ total: line.kind === 'total' }"><td>{{ line.label }}<span v-if="line.note" class="note">{{ line.note }}</span></td><td class="n" :class="{ neg: line.amount < 0 }">{{ amount(line.amount) }}</td></tr></tbody></table></section>
            </div>
            <section><h3>{{ copy.details }}</h3><table class="metrics"><tbody><tr v-for="item in metrics" :key="item.label"><td>{{ item.label }}<span class="note">{{ item.note }}</span></td><td class="n">{{ item.text }}</td></tr></tbody></table></section>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@600;700&family=IBM+Plex+Mono:wght@500&display=swap');
.purchase-page { --bg:#eef1f3; --panel:#fff; --ink:#18222c; --muted:#5e6b76; --line:#d9dfe4; --accent:#1d5b74; --accent-soft:#e3eef2; --neg:#a1452f; --f-display:'Noto Serif SC','Songti SC',serif; --f-body:'Noto Sans SC','PingFang SC','Hiragino Sans',system-ui,sans-serif; --f-num:'IBM Plex Mono',ui-monospace,monospace; min-height:100vh; background:var(--bg); color:var(--ink); font:14px/1.6 var(--f-body); }
.purchase-page * { box-sizing:border-box; }
.purchase-wrap { max-width:1080px; margin:0 auto; padding:28px max(16px,env(safe-area-inset-right,0px)) 48px max(16px,env(safe-area-inset-left,0px)); display:grid; grid-template-columns:340px minmax(0,1fr); gap:28px; align-items:start; }
.left { display:flex; flex-direction:column; gap:16px; min-width:0; }
.form { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:20px; display:flex; flex-direction:column; gap:10px; }
.form h2 { margin:0; font-size:15px; font-weight:700; }
.form .hint { margin:-4px 0 4px; color:var(--muted); font-size:12px; }
.field { display:grid; grid-template-columns:112px minmax(0,1fr); align-items:center; gap:10px; }
.field label { font-size:12.5px; color:var(--muted); font-weight:500; line-height:1.35; }
.inp { display:flex; align-items:center; height:38px; border:1px solid var(--line); border-radius:6px; background:#fff; }
.inp:focus-within { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-soft); }
.inp input,.inp select { flex:1; min-width:0; height:100%; border:0; outline:0; padding:0 10px; font:inherit; font-size:15px; background:transparent; color:var(--ink); font-variant-numeric:tabular-nums; }
.inp select { font-size:14px; cursor:pointer; }
.inp input[type=number] { text-align:right; appearance:textfield; }
.inp input::-webkit-outer-spin-button,.inp input::-webkit-inner-spin-button { appearance:none; margin:0; }
.inp span { width:3em; flex:none; padding-right:10px; color:var(--muted); font-size:12px; }
.check { display:flex; gap:8px; align-items:center; font-size:13px; cursor:pointer; margin-left:122px; }
.check input { accent-color:var(--accent); width:16px; height:16px; margin:0; }
.sub { font-size:12px; color:var(--muted); padding-top:10px; border-top:1px dashed var(--line); margin-top:6px; }
.hist { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:16px 20px 18px; display:flex; flex-direction:column; gap:10px; }
.hist-head { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }
.hist-head h2 { margin:0; font-size:15px; font-weight:700; }
.btn-s { font:inherit; font-size:12.5px; color:var(--accent); background:var(--panel); border:1px solid var(--line); border-radius:5px; padding:4px 10px; cursor:pointer; white-space:nowrap; }
.btn-s:hover { border-color:var(--accent); }
.btn-s:focus-visible { outline:2px solid var(--accent); outline-offset:1px; }
.btn-s.danger { color:var(--neg); }
.hist-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; max-height:360px; overflow-y:auto; }
.hist-list li { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:8px; padding:8px 0; border-bottom:1px solid var(--line); }
.hist-list li:last-child { border-bottom:0; }
.hist-entry { min-width:0; }
.hist-list .t { font-size:13.5px; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hist-list .d { font-size:11.5px; color:var(--muted); font-variant-numeric:tabular-nums; }
.hist-list .ops { display:flex; gap:4px; }
.hist-list li.cur .t { color:var(--accent); }
.tag { font-size:12px; color:var(--accent); padding:4px 6px; white-space:nowrap; }
.hist-empty { font-size:12.5px; color:var(--muted); margin:0; }
.hist-msg { font-size:12px; color:var(--accent); margin:-4px 0 0; }
.hist-msg:empty { display:none; }
.right { display:flex; flex-direction:column; gap:12px; min-width:0; }
.toolbar { display:flex; align-items:center; justify-content:flex-end; gap:12px; flex-wrap:wrap; }
.btn { font:inherit; font-size:14px; font-weight:500; color:#fff; background:var(--accent); border:0; border-radius:6px; padding:9px 18px; cursor:pointer; }
.btn:hover { filter:brightness(1.1); }
.btn:focus-visible { outline:3px solid var(--accent-soft); outline-offset:2px; }
.btn:disabled { opacity:.6; cursor:progress; }
.card { background:var(--panel); border-radius:4px; box-shadow:0 1px 2px rgba(24,34,44,.06),0 8px 28px rgba(24,34,44,.08); overflow:hidden; min-width:0; }
.card-head { background:var(--accent); color:#fff; padding:22px 28px 20px; }
.card-head .eyebrow { font-size:11px; letter-spacing:.14em; opacity:.75; }
.card-head h1 { margin:4px 0 2px; font-family:var(--f-display); font-size:26px; font-weight:700; text-wrap:balance; color:#fff; }
.card-head .specs { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0; }
.card-head .specs span { background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.25); border-radius:3px; padding:2px 9px; font-size:12.5px; font-variant-numeric:tabular-nums; }
.card-head .meta { font-size:12px; opacity:.8; font-variant-numeric:tabular-nums; }
.card-body { padding:22px 28px 26px; display:flex; flex-direction:column; gap:22px; }
.hero { display:grid; grid-template-columns:1.2fr 1fr 1fr; border:1px solid var(--line); }
.hero > div { padding:14px 16px; }
.hero > div + div { border-left:1px solid var(--line); }
.hero .k { font-size:12px; color:var(--muted); }
.hero .v { font-family:var(--f-num); font-size:22px; font-variant-numeric:tabular-nums; }
.hero .main { background:var(--accent-soft); }
.hero .main .v { font-size:34px; color:var(--accent); line-height:1.2; }
.hero .main .k { color:var(--accent); font-weight:700; }
.card section h3 { margin:0 0 6px; font-size:13px; font-weight:700; letter-spacing:.04em; }
.card table { width:100%; border-collapse:collapse; font-variant-numeric:tabular-nums; }
.card td { padding:7px 0; border-bottom:1px solid var(--line); vertical-align:top; font-size:13px; }
.card td.n { text-align:right; font-family:var(--f-num); white-space:nowrap; padding-left:12px; }
.card td .note { display:block; font-size:11px; color:var(--muted); }
.card tr.extra td { color:var(--muted); border-bottom:0; }
.card tr.total td { border-bottom:0; border-top:2px solid var(--ink); font-weight:700; padding-top:9px; }
.card .neg { color:var(--neg); }
.two { display:grid; grid-template-columns:1fr 1fr; gap:28px; }
@media (max-width:820px) { .purchase-wrap { grid-template-columns:1fr; } }
@media (max-width:620px) { .two { grid-template-columns:1fr; gap:22px; } }
@media (max-width:520px) { .hero { grid-template-columns:1fr 1fr; } .hero .main { grid-column:1 / -1; } .hero > div + div { border-left:0; border-top:1px solid var(--line); } .hero > div:last-child { border-left:1px solid var(--line); } .card-head,.card-body { padding-inline:18px; } }
@media (max-width:380px) { .field { grid-template-columns:1fr; gap:4px; } .check { margin-left:0; } }
</style>
