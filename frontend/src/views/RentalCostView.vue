<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Clock, Close, DocumentChecked, Plus, Refresh } from '@element-plus/icons-vue'
import { useSettingsStore } from '@/stores/settings'
import RentalCostReportView from '@/components/rental-cost/RentalCostReportView.vue'
import {
  buildRentalCostReport, itemDescription, itemLabel, materialLabel, suggestCurrentMonthRent,
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

interface CostItemState { key: RentalCostItemKey; enabled: boolean; amount: number | null; amountText: string }
interface CustomCostItemState { id: string; label: string; amount: number | null; amountText: string }
interface MaterialState { key: RentalMaterialKey; enabled: boolean }
interface CustomMaterialState { id: string; label: string }

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

const settings = useSettingsStore()
const zh = computed(() => settings.locale === 'zh-CN')

const monthlyRent = ref<number | null>(null)
const rentText = ref('')
const moveInDate = ref<string | null>(null)

const costItems = reactive<CostItemState[]>(
  RENTAL_COST_ITEM_KEYS.map((key) => ({ key, enabled: false, amount: null, amountText: '' })),
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
  intro: '按房源实际收费项目逐项勾选并填写金额，生成一份可直接交给客户查看的初期费用与材料清单。费用项目、材料要求以实际合同和房源要求为准。',
  available: '可使用', duration: '约 3 分钟', privacy: '输入仅保存在当前页面，不发送、不保存',
  formTitle: '选择适用的费用项目并填写金额',
  rent: '每月房租（选填，仅作参考）', moveInDate: '入住日期（选填，仅作参考）',
  costTitle: '费用项目', materialsTitle: '需要准备的材料',
  addCostItem: '添加自定义费用项目', addMaterial: '添加自定义材料',
  customItemLabel: '项目名称', customMaterialLabel: '材料名称',
  applyReference: '填入参考值',
  generate: '生成报告', reset: '重置',
  validationAmount: '请为已勾选的费用项目填写金额。',
  validationCustom: '自定义项目请同时填写名称和金额，或删除未完成的行。',
  validationEmpty: '请至少勾选一个费用项目并填写金额。',
  reportTitle: '租房初期费用清单预览',
  close: '关闭', print: '打印 / 另存为PDF',
} : {
  eyebrow: '賃貸初期費用一覧',
  title: '賃貸初期費用診断',
  intro: '物件の実際の請求項目にチェックを入れ、金額を入力することで、お客様にそのままお渡しできる初期費用・必要書類の一覧を作成します。費用項目や必要書類は実際の契約内容・物件条件に基づきます。',
  available: '利用可能', duration: '約3分', privacy: '入力はこのページ内のみ・送信も保存もしません',
  formTitle: '該当する費用項目を選択し、金額を入力してください',
  rent: '月額賃料（任意・参考用）', moveInDate: '入居日（任意・参考用）',
  costTitle: '費用項目', materialsTitle: '必要書類',
  addCostItem: '費用項目を追加', addMaterial: '書類を追加',
  customItemLabel: '項目名', customMaterialLabel: '書類名',
  applyReference: '参考額を入力',
  generate: 'レポートを作成', reset: 'リセット',
  validationAmount: 'チェックした費用項目の金額を入力してください。',
  validationCustom: '自由項目は名称と金額の両方を入力するか、未完了の行を削除してください。',
  validationEmpty: '費用項目を1つ以上選択し、金額を入力してください。',
  reportTitle: '賃貸初期費用一覧・プレビュー',
  close: '閉じる', print: '印刷 / PDFとして保存',
})

const suggestedCurrentMonthRent = computed(() => {
  if (monthlyRent.value === null || !moveInDate.value) return null
  return suggestCurrentMonthRent(monthlyRent.value, moveInDate.value)
})

function updateRent(value: string) {
  monthlyRent.value = parseIntegerInput(value, MAX_AMOUNT_YEN)
  rentText.value = monthlyRent.value === null ? '' : value
}
function formatRent() { rentText.value = formatInteger(monthlyRent.value) }

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
  item.enabled = true
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
  const enabledPresets = costItems.filter((item) => item.enabled)
  if (enabledPresets.some((item) => item.amount === null)) {
    return ElMessage.warning(copy.value.validationAmount)
  }
  const incompleteCustom = customCostItems.value.some(
    (item) => (item.label.trim().length > 0) !== (item.amount !== null),
  )
  if (incompleteCustom) {
    return ElMessage.warning(copy.value.validationCustom)
  }
  const validCustomItems = customCostItems.value.filter((item) => item.label.trim() && item.amount !== null)
  if (enabledPresets.length === 0 && validCustomItems.length === 0) {
    return ElMessage.warning(copy.value.validationEmpty)
  }

  const items: RentalCostReportLineItem[] = [
    ...enabledPresets.map((item) => ({ key: item.key, isCustom: false, amount: item.amount as number })),
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
    items,
    materials: materialList,
    locale: settings.locale,
  })
  reportVisible.value = true
  trackEvent({ type: 'tool_complete', toolId: 'rental' })
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
  monthlyRent.value = null
  rentText.value = ''
  moveInDate.value = null
  costItems.forEach((item) => { item.enabled = false; item.amount = null; item.amountText = '' })
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
          <div class="detail-tags">
            <el-tag type="success" effect="light" round>{{ copy.available }}</el-tag>
            <span><el-icon><Clock /></el-icon>{{ copy.duration }}</span>
            <span><el-icon><DocumentChecked /></el-icon>{{ copy.privacy }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="section calculator-section"><div class="container calculator-shell">
      <div class="calculator-panel">
        <div class="panel-heading"><span>01</span><div><h2>{{ copy.formTitle }}</h2><p>{{ copy.privacy }}</p></div></div>

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

          <h3>{{ copy.costTitle }}</h3>
          <div v-for="item in costItems" :key="item.key" class="checklist-item" :class="{ active: item.enabled }">
            <el-checkbox v-model="item.enabled">
              <span class="checklist-item-copy"><strong>{{ itemLabel(item.key, zh) }}</strong><small>{{ itemDescription(item.key, zh) }}</small></span>
            </el-checkbox>
            <div v-if="item.enabled" class="checklist-item-amount">
              <el-input :model-value="item.amountText" inputmode="numeric" autocomplete="off" placeholder="0" @input="(v: string) => updateItemAmount(item, v)" @blur="() => formatItemAmount(item)" />
              <span>{{ zh ? '日元' : '円' }}</span>
              <span v-if="item.key === 'currentMonthRent' && suggestedCurrentMonthRent !== null" class="field-hint">
                {{ zh ? `参考日割金额：${formatInteger(suggestedCurrentMonthRent)} 日元` : `日割参考額：${formatInteger(suggestedCurrentMonthRent)}円` }}
                <button type="button" @click="applySuggestedRent">{{ copy.applyReference }}</button>
              </span>
            </div>
          </div>

          <div v-for="item in customCostItems" :key="item.id" class="custom-item-row">
            <el-input v-model="item.label" :placeholder="copy.customItemLabel" />
            <div class="custom-item-amount">
              <el-input :model-value="item.amountText" inputmode="numeric" autocomplete="off" placeholder="0" @input="(v: string) => updateItemAmount(item, v)" @blur="() => formatItemAmount(item)" />
              <span>{{ zh ? '日元' : '円' }}</span>
            </div>
            <button type="button" class="custom-item-remove" :aria-label="zh ? '删除' : '削除'" @click="removeCustomItem(item.id)"><el-icon><Close /></el-icon></button>
          </div>
          <button type="button" class="text-link" @click="addCustomItem"><el-icon><Plus /></el-icon>{{ copy.addCostItem }}</button>

          <h3>{{ copy.materialsTitle }}</h3>
          <div class="material-grid">
            <el-checkbox v-for="material in materials" :key="material.key" v-model="material.enabled">
              {{ materialLabel(material.key, zh) }}
            </el-checkbox>
          </div>
          <div v-for="material in customMaterials" :key="material.id" class="custom-material-row">
            <el-input v-model="material.label" :placeholder="copy.customMaterialLabel" />
            <button type="button" class="custom-item-remove" :aria-label="zh ? '删除' : '削除'" @click="removeCustomMaterial(material.id)"><el-icon><Close /></el-icon></button>
          </div>
          <button type="button" class="text-link" @click="addCustomMaterial"><el-icon><Plus /></el-icon>{{ copy.addMaterial }}</button>
        </el-form>

        <div class="calculator-actions">
          <el-button size="large" @click="reset"><el-icon><Refresh /></el-icon>{{ copy.reset }}</el-button>
          <el-button type="primary" size="large" @click="generateReport"><el-icon><DocumentChecked /></el-icon>{{ copy.generate }}</el-button>
        </div>
      </div>
    </div></section>

    <el-dialog v-model="reportVisible" class="report-dialog" :title="copy.reportTitle" width="min(1100px, 96vw)" append-to-body>
      <div class="report-page-background"><RentalCostReportView v-if="report" :key="report.locale" :report="report" /></div>
      <template #footer>
        <div class="report-actions">
          <el-button @click="reportVisible = false">{{ copy.close }}</el-button>
          <el-button type="primary" @click="printReport">{{ copy.print }}</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
