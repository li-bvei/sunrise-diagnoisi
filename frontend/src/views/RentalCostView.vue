<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, DocumentChecked, Plus, Refresh, CopyDocument, Printer } from '@element-plus/icons-vue'
import { useSettingsStore } from '@/stores/settings'
import RentalCostReportView from '@/components/rental-cost/RentalCostReportView.vue'
import {
  buildRentalCostReport, itemLabel, materialLabel, suggestCurrentMonthRent,
} from '@/utils/rentalCostCalculator'
import { formatInteger, parseIntegerInput } from '@/utils/numericInput'
import { trackEvent } from '@/utils/analytics'
import {
  RENTAL_COST_ITEM_KEYS, RENTAL_MATERIAL_KEYS,
} from '@/types/rentalCost'
import type {
  RentalCostItemKey, RentalCostReport, RentalCostReportLineItem, RentalCostReportMaterial, RentalMaterialKey,
} from '@/types/rentalCost'

const MAX_AMOUNT_YEN = 50_000_000

interface CostItemState { key: RentalCostItemKey; amount: number | null; amountText: string }
interface CustomCostItemState { id: string; label: string; amount: number | null; amountText: string }
interface MaterialState { key: RentalMaterialKey; enabled: boolean }
interface CustomMaterialState { id: string; label: string }
type PropertyNumberKey = 'walkMinutes' | 'area' | 'buildingAge' | 'managementFee'

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

const settings = useSettingsStore()
const zh = computed(() => settings.locale === 'zh-CN')

const monthlyRent = ref<number | null>(null)
const rentText = ref('')
const moveInDate = ref<string | null>(null)
const property = reactive({ name: '', address: '', station: '', walkMinutes: null as number | null, area: null as number | null, buildingAge: null as number | null, managementFee: null as number | null })

const costItems = reactive<CostItemState[]>(
  RENTAL_COST_ITEM_KEYS.map((key) => ({ key, amount: null, amountText: '' })),
)
const customCostItems = ref<CustomCostItemState[]>([])
const materials = reactive<MaterialState[]>(
  RENTAL_MATERIAL_KEYS.map((key) => ({ key, enabled: false })),
)
const customMaterials = ref<CustomMaterialState[]>([])

const report = ref<RentalCostReport | null>(null)
const reportVisible = ref(false)

onMounted(() => trackEvent({ type: 'tool_view', toolId: 'rental' }))

const copy = computed(() => zh.value ? {
  eyebrow: '租房初期费用清单',
  title: '租房初期费用诊断',
  intro: '输入房源条件和实际收费金额，汇总初期费用并生成可直接发给客户的说明。',
  formTitle: '房源与费用',
  propertyTitle: '房源信息', propertyName: '房源名称', address: '地址', station: '最近车站', walkMinutes: '步行', area: '面积', buildingAge: '建筑年限', managementFee: '月管理费 / 共益费', minutes: '分钟', sqm: '㎡', years: '年',
  rent: '每月房租（选填，仅作参考）', moveInDate: '入住日期（选填，仅作参考）',
  costTitle: '初期费用', materialsTitle: '申请材料（可选）', total: '当前初期费用合计',
  addCostItem: '添加自定义费用项目', addMaterial: '添加自定义材料',
  customItemLabel: '项目名称', customMaterialLabel: '材料名称',
  applyReference: '填入参考值',
  generate: '生成客户说明', reset: '重置', copyText: '复制给客户', print: '打印 / 保存为 PDF', copied: '客户说明已复制',
  validationCustom: '自定义项目请同时填写名称和金额，或删除未完成的行。',
  validationEmpty: '请至少填写一项费用金额。',
  reportTitle: '租房初期费用清单预览',
  close: '关闭',
} : {
  eyebrow: '賃貸初期費用一覧',
  title: '賃貸初期費用診断',
  intro: '物件条件と実際の費用を入力し、初期費用の合計とお客様向けの案内文を作成します。',
  formTitle: '物件・費用',
  propertyTitle: '物件情報', propertyName: '物件名', address: '住所', station: '最寄り駅', walkMinutes: '徒歩', area: '面積', buildingAge: '築年数', managementFee: '月額管理費・共益費', minutes: '分', sqm: '㎡', years: '年',
  rent: '月額賃料（任意・参考用）', moveInDate: '入居日（任意・参考用）',
  costTitle: '初期費用', materialsTitle: '申込書類（任意）', total: '初期費用の合計',
  addCostItem: '費用項目を追加', addMaterial: '書類を追加',
  customItemLabel: '項目名', customMaterialLabel: '書類名',
  applyReference: '参考額を入力',
  generate: 'お客様向け文面を作成', reset: 'リセット', copyText: 'お客様向けにコピー', print: '印刷 / PDF保存', copied: 'お客様向け文面をコピーしました',
  validationCustom: '自由項目は名称と金額の両方を入力するか、未完了の行を削除してください。',
  validationEmpty: '費用金額を1項目以上入力してください。',
  reportTitle: '賃貸初期費用一覧・プレビュー',
  close: '閉じる',
})

const suggestedCurrentMonthRent = computed(() => {
  if (monthlyRent.value === null || !moveInDate.value) return null
  return suggestCurrentMonthRent(monthlyRent.value, moveInDate.value)
})
const liveTotal = computed(() => costItems.reduce((sum, item) => sum + (item.amount ?? 0), 0)
  + customCostItems.value.reduce((sum, item) => sum + (item.label.trim() && item.amount !== null ? item.amount : 0), 0))

function updateRent(value: string) {
  monthlyRent.value = parseIntegerInput(value, MAX_AMOUNT_YEN)
  rentText.value = monthlyRent.value === null ? '' : value
}
function formatRent() { rentText.value = formatInteger(monthlyRent.value) }

function updatePropertyNumber(key: PropertyNumberKey, value: string | number) {
  const parsed = value === '' ? null : Number(value)
  if (parsed === null || (Number.isFinite(parsed) && parsed >= 0)) property[key] = parsed
}

function updateItemAmount(item: CostItemState | CustomCostItemState, value: string) {
  item.amount = parseIntegerInput(value, MAX_AMOUNT_YEN)
  item.amountText = item.amount === null ? '' : value
}
function formatItemAmount(item: CostItemState | CustomCostItemState) {
  item.amountText = formatInteger(item.amount)
}

function applySuggestedRent() {
  const item = costItems.find((i) => i.key === 'currentMonthRent')
  if (!item || suggestedCurrentMonthRent.value === null) return
  item.amount = suggestedCurrentMonthRent.value
  item.amountText = formatInteger(item.amount)
}

function addCustomItem() {
  customCostItems.value.push({ id: newId(), label: '', amount: null, amountText: '' })
}
function removeCustomItem(id: string) {
  customCostItems.value = customCostItems.value.filter((item) => item.id !== id)
}
function addCustomMaterial() {
  customMaterials.value.push({ id: newId(), label: '' })
}
function removeCustomMaterial(id: string) {
  customMaterials.value = customMaterials.value.filter((material) => material.id !== id)
}

function generateReport() {
  const incompleteCustom = customCostItems.value.some(
    (item) => (item.label.trim().length > 0) !== (item.amount !== null),
  )
  if (incompleteCustom) {
    return ElMessage.warning(copy.value.validationCustom)
  }
  const enteredPresets = costItems.filter((item) => item.amount !== null)
  const validCustomItems = customCostItems.value.filter((item) => item.label.trim() && item.amount !== null)
  if (enteredPresets.length === 0 && validCustomItems.length === 0) {
    return ElMessage.warning(copy.value.validationEmpty)
  }

  const items: RentalCostReportLineItem[] = [
    ...enteredPresets.map((item) => ({ key: item.key, isCustom: false, amount: item.amount as number })),
    ...validCustomItems.map((item) => ({ key: item.id, isCustom: true, label: item.label.trim(), amount: item.amount as number })),
  ]
  const enabledMaterialPresets = materials.filter((material) => material.enabled)
  const validCustomMaterials = customMaterials.value.filter((material) => material.label.trim())
  const materialList: RentalCostReportMaterial[] = [
    ...enabledMaterialPresets.map((material) => ({ key: material.key, isCustom: false })),
    ...validCustomMaterials.map((material) => ({ key: material.id, isCustom: true, label: material.label.trim() })),
  ]

  report.value = buildRentalCostReport({
    monthlyRent: monthlyRent.value,
    moveInDate: moveInDate.value,
    property: { ...property },
    items,
    materials: materialList,
    locale: settings.locale,
  })
  reportVisible.value = true
  trackEvent({ type: 'tool_complete', toolId: 'rental' })
}

const clientText = computed(() => {
  if (!report.value) return ''
  const zh = report.value.locale === 'zh-CN'
  const p = report.value.property
  const lines = [zh ? `【房源信息】${p.name || '—'}` : `【物件情報】${p.name || '—'}`]
  if (p.address) lines.push(`${zh ? '地址' : '住所'}：${p.address}`)
  if (p.station) lines.push(`${zh ? '交通' : '交通'}：${p.station}${p.walkMinutes !== null ? ` ${zh ? '步行' : '徒歩'}${p.walkMinutes}${zh ? '分钟' : '分'}` : ''}`)
  if (p.area !== null) lines.push(`${zh ? '面积' : '専有面積'}：${p.area}㎡`)
  if (p.buildingAge !== null) lines.push(`${zh ? '建筑年限' : '築年数'}：${p.buildingAge}${zh ? '年' : '年'}`)
  if (report.value.monthlyRent !== null) lines.push(`${zh ? '月租金' : '月額賃料'}：${yen(report.value.monthlyRent, zh)}`)
  if (p.managementFee !== null) lines.push(`${zh ? '月管理费/共益费' : '月額管理費・共益費'}：${yen(p.managementFee, zh)}`)
  if (report.value.moveInDate) lines.push(`${zh ? '入住日期' : '入居日'}：${report.value.moveInDate.replace(/-/g, '/')}`)
  lines.push('', zh ? '【初期费用】' : '【初期費用】')
  for (const item of report.value.items) {
    lines.push(`${item.isCustom ? item.label : itemLabel(item.key as RentalCostItemKey, zh)}：${yen(item.amount, zh)}`)
  }
  lines.push(`${zh ? '初期费用合计' : '初期費用合計'}：${yen(report.value.total, zh)}`)
  if (report.value.materials.length) {
    lines.push('', zh ? '【申请材料】' : '【申込書類】')
    for (const material of report.value.materials) lines.push(`・${material.isCustom ? material.label : materialLabel(material.key as RentalMaterialKey, zh)}`)
  }
  return lines.join('\n')
})

function yen(amount: number, zh: boolean) {
  return `${new Intl.NumberFormat('en-US').format(amount)}${zh ? '日元' : '円'}`
}

async function copyClientText() {
  try {
    await navigator.clipboard.writeText(clientText.value)
    ElMessage.success(copy.value.copied)
  } catch {
    ElMessage.error(zh.value ? '复制失败，请手动选择文本复制' : 'コピーできませんでした。文面を選択してコピーしてください')
  }
}

function printReport() {
  window.print()
}

function reset() {
  monthlyRent.value = null
  rentText.value = ''
  moveInDate.value = null
  Object.assign(property, { name: '', address: '', station: '', walkMinutes: null, area: null, buildingAge: null, managementFee: null })
  costItems.forEach((item) => { item.amount = null; item.amountText = '' })
  customCostItems.value = []
  materials.forEach((material) => { material.enabled = false })
  customMaterials.value = []
  report.value = null
  reportVisible.value = false
}
</script>

<template>
  <div class="page-surface calculator-page">
    <section class="calculator-hero">
      <div class="container calculator-hero-grid">
        <div>
          <span class="eyebrow">{{ copy.eyebrow }}</span><h1>{{ copy.title }}</h1><p>{{ copy.intro }}</p>
        </div>
      </div>
    </section>

    <section class="section calculator-section"><div class="container calculator-shell">
      <div class="calculator-panel">
        <div class="panel-heading"><span>01</span><div><h2>{{ copy.formTitle }}</h2></div></div>

        <el-form label-position="top" class="calculator-form">
          <div class="form-grid">
            <el-form-item :label="copy.rent">
              <el-input :model-value="rentText" inputmode="numeric" autocomplete="off" placeholder="80000" @input="updateRent" @blur="formatRent" />
              <span class="field-unit simple">{{ zh ? '日元/月' : '円/月' }}</span>
            </el-form-item>
            <el-form-item :label="copy.moveInDate">
              <el-date-picker v-model="moveInDate" type="date" value-format="YYYY-MM-DD" format="YYYY/MM/DD" />
            </el-form-item>
          </div>

          <h3>{{ copy.propertyTitle }}</h3>
          <div class="form-grid rental-property-grid">
            <el-form-item :label="copy.propertyName"><el-input v-model="property.name" :placeholder="copy.propertyName" /></el-form-item>
            <el-form-item :label="copy.address"><el-input v-model="property.address" :placeholder="copy.address" /></el-form-item>
            <el-form-item :label="copy.station"><el-input v-model="property.station" :placeholder="zh ? '例：梅田駅' : '例：梅田駅'" /></el-form-item>
            <el-form-item :label="copy.walkMinutes"><el-input :model-value="property.walkMinutes ?? ''" type="number" min="0" max="999" step="1" @input="(value: string | number) => updatePropertyNumber('walkMinutes', value)" /><span class="field-unit simple">{{ copy.minutes }}</span></el-form-item>
            <el-form-item :label="copy.area"><el-input :model-value="property.area ?? ''" type="number" min="0" max="9999" step="0.01" @input="(value: string | number) => updatePropertyNumber('area', value)" /><span class="field-unit simple">{{ copy.sqm }}</span></el-form-item>
            <el-form-item :label="copy.buildingAge"><el-input :model-value="property.buildingAge ?? ''" type="number" min="0" max="999" step="1" @input="(value: string | number) => updatePropertyNumber('buildingAge', value)" /><span class="field-unit simple">{{ copy.years }}</span></el-form-item>
            <el-form-item :label="copy.managementFee"><el-input :model-value="property.managementFee ?? ''" type="number" min="0" :max="MAX_AMOUNT_YEN" step="1000" @input="(value: string | number) => updatePropertyNumber('managementFee', value)" /><span class="field-unit simple">{{ zh ? '日元/月' : '円/月' }}</span></el-form-item>
          </div>

          <h3>{{ copy.costTitle }}</h3>
          <div class="rental-fee-grid">
            <div v-for="item in costItems" :key="item.key" class="rental-fee-row">
              <label>{{ itemLabel(item.key, zh) }}</label>
              <div class="rental-fee-input">
                <el-input :model-value="item.amountText" inputmode="numeric" autocomplete="off" :placeholder="zh ? '金额' : '金額'" @input="(v: string) => updateItemAmount(item, v)" @blur="() => formatItemAmount(item)" />
                <span>{{ zh ? '日元' : '円' }}</span>
                <span v-if="item.key === 'currentMonthRent' && suggestedCurrentMonthRent !== null" class="field-hint">
                  {{ zh ? `日割参考 ${formatInteger(suggestedCurrentMonthRent)}` : `日割り参考 ${formatInteger(suggestedCurrentMonthRent)}` }}
                  <button type="button" @click="applySuggestedRent">{{ copy.applyReference }}</button>
                </span>
              </div>
            </div>
          </div>

          <div v-for="item in customCostItems" :key="item.id" class="custom-item-row">
            <el-input v-model="item.label" :placeholder="copy.customItemLabel" />
            <div class="custom-item-amount">
              <el-input :model-value="item.amountText" inputmode="numeric" autocomplete="off" :placeholder="zh ? '金额' : '金額'" @input="(v: string) => updateItemAmount(item, v)" @blur="() => formatItemAmount(item)" />
              <span>{{ zh ? '日元' : '円' }}</span>
            </div>
            <button type="button" class="custom-item-remove" :aria-label="zh ? '删除' : '削除'" @click="removeCustomItem(item.id)"><el-icon><Close /></el-icon></button>
          </div>
          <button type="button" class="text-link" @click="addCustomItem"><el-icon><Plus /></el-icon>{{ copy.addCostItem }}</button>

          <div class="rental-live-total"><span>{{ copy.total }}</span><strong>{{ formatInteger(liveTotal) }} {{ zh ? '日元' : '円' }}</strong></div>

          <details class="rental-materials">
            <summary>{{ copy.materialsTitle }}</summary>
            <div class="material-grid">
              <el-checkbox v-for="material in materials" :key="material.key" v-model="material.enabled">{{ materialLabel(material.key, zh) }}</el-checkbox>
            </div>
            <div v-for="material in customMaterials" :key="material.id" class="custom-material-row">
              <el-input v-model="material.label" :placeholder="copy.customMaterialLabel" />
              <button type="button" class="custom-item-remove" :aria-label="zh ? '删除' : '削除'" @click="removeCustomMaterial(material.id)"><el-icon><Close /></el-icon></button>
            </div>
            <button type="button" class="text-link" @click="addCustomMaterial"><el-icon><Plus /></el-icon>{{ copy.addMaterial }}</button>
          </details>
        </el-form>

        <div class="calculator-actions">
          <el-button size="large" @click="reset"><el-icon><Refresh /></el-icon>{{ copy.reset }}</el-button>
          <el-button type="primary" size="large" @click="generateReport"><el-icon><DocumentChecked /></el-icon>{{ copy.generate }}</el-button>
        </div>
      </div>
    </div></section>

    <el-dialog v-model="reportVisible" class="report-dialog rental-report-dialog" :title="copy.reportTitle" width="min(1100px, 96vw)" append-to-body>
      <div class="report-page-background"><RentalCostReportView v-if="report" :key="report.locale" :report="report" /></div>
      <div v-if="report" class="client-copy-panel">
        <div class="client-copy-heading"><strong>{{ zh ? '可直接发送给客户' : 'お客様にそのまま送れる文面' }}</strong><el-button type="primary" @click="copyClientText"><el-icon><CopyDocument /></el-icon>{{ copy.copyText }}</el-button></div>
        <el-input :model-value="clientText" type="textarea" :rows="Math.min(18, Math.max(7, clientText.split('\n').length))" readonly />
      </div>
      <template #footer>
        <div class="report-actions">
          <el-button @click="printReport"><el-icon><Printer /></el-icon>{{ copy.print }}</el-button>
          <el-button @click="reportVisible = false">{{ copy.close }}</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
