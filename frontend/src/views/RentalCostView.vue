<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useSettingsStore } from '@/stores/settings'
import { trackEvent } from '@/utils/analytics'
import { buildRentalCostReport, itemLabel, materialLabel, RENTAL_COST_RULES_VERSION, suggestCurrentMonthRent } from '@/utils/rentalCostCalculator'
import { formatYen, propertyProfileLines } from '@/utils/propertyText'
import { deleteRentalScenario, listRentalScenarios, saveRentalScenario } from '@/utils/rentalScenarioApi'
import { RENTAL_COST_ITEM_KEYS, RENTAL_MATERIAL_KEYS } from '@/types/rentalCost'
import type { RentalCostInput, RentalCostItemKey, RentalCostScenario, RentalMaterialKey } from '@/types/rentalCost'

const CURRENT_ID_KEY = 'rental-cost-current-id'
const settings = useSettingsStore()
const zh = computed(() => settings.locale === 'zh-CN')
const blankInput = (): RentalCostInput => ({
  monthlyRent: null, moveInDate: null,
  property: { name: '', address: '', station: '', walkMinutes: null, area: null, layout: '', buildingAge: null, managementFee: null },
  costs: Object.fromEntries(RENTAL_COST_ITEM_KEYS.map((key) => [key, null])) as RentalCostInput['costs'],
  customCosts: [], materials: [], customMaterials: [],
})
const input = reactive<RentalCostInput>(blankInput())
const history = ref<RentalCostScenario[]>([])
const currentId = ref<string | null>(null)
const pendingDelete = ref<string | null>(null)
const status = ref('')
let saveTimer: ReturnType<typeof setTimeout> | null = null
let writeChain: Promise<unknown> = Promise.resolve()
let lastSavedFingerprint = ''
let suppressSave = false

const copy = computed(() => zh.value ? {
  input: '输入房源与费用', property: '房源信息', fees: '初期费用', materials: '申请材料',
  name: '物件名称', address: '地址', station: '最近车站', walk: '步行', area: '面积', layout: '格局', age: '建筑年限', management: '月管理费',
  rent: '月租金', date: '入住日期', addCost: '＋ 添加费用项目', addMaterial: '＋ 添加材料', custom: '项目名称', amount: '金额', remove: '删除',
  prorated: '日割参考', apply: '填入', history: '历史记录', create: '＋ 新建物件', empty: '输入房源信息或费用后会自动保存。',
  saved: '已自动保存', saving: '保存中…', saveError: '数据库保存失败', loadError: '历史记录读取失败', retry: '重试', load: '载入', editing: '编辑中', confirmDelete: '确认删除', deleted: '已删除',
  report: '租房初期费用清单', unnamed: '未命名物件', total: '初期费用合计', item: '费用明细', noFees: '填写费用后，明细会显示在这里。',
  monthly: '每月费用', customer: '发送给客户的文本', copy: '复制文本', copied: '已复制', print: '打印 / 保存为 PDF',
  dateLabel: '测算日', yen: '日元', min: '分钟', years: '年',
} : {
  input: '物件・費用を入力', property: '物件情報', fees: '初期費用', materials: '申込書類',
  name: '物件名', address: '住所', station: '最寄り駅', walk: '徒歩', area: '面積', layout: '間取り', age: '築年数', management: '月額管理費',
  rent: '月額賃料', date: '入居日', addCost: '＋ 費用項目を追加', addMaterial: '＋ 書類を追加', custom: '項目名', amount: '金額', remove: '削除',
  prorated: '日割り参考', apply: '入力', history: '履歴', create: '＋ 新規物件', empty: '物件情報または費用を入力すると自動保存します。',
  saved: '自動保存しました', saving: '保存中…', saveError: 'データベースへの保存に失敗しました', loadError: '履歴を読み込めませんでした', retry: '再保存', load: '読込', editing: '編集中', confirmDelete: '削除を確定', deleted: '削除しました',
  report: '賃貸初期費用一覧', unnamed: '名称未設定の物件', total: '初期費用合計', item: '費用内訳', noFees: '費用を入力すると内訳が表示されます。',
  monthly: '月額費用', customer: 'お客様向けの文面', copy: '文面をコピー', copied: 'コピーしました', print: '印刷 / PDF保存',
  dateLabel: '試算日', yen: '円', min: '分', years: '年',
})

function reportFor(data: RentalCostInput) {
  return buildRentalCostReport({
    monthlyRent: data.monthlyRent, moveInDate: data.moveInDate, property: data.property,
    items: [
      ...RENTAL_COST_ITEM_KEYS.filter((key) => data.costs[key] !== null).map((key) => ({ key, isCustom: false, amount: data.costs[key] as number })),
      ...data.customCosts.filter((row) => row.label.trim() && row.amount !== null).map((row) => ({ key: row.id, isCustom: true, label: row.label.trim(), amount: row.amount as number })),
    ],
    materials: [
      ...data.materials.map((key) => ({ key, isCustom: false })),
      ...data.customMaterials.filter((row) => row.label.trim()).map((row) => ({ key: row.id, isCustom: true, label: row.label.trim() })),
    ],
    locale: settings.locale,
  })
}
const report = computed(() => reportFor(input))
const suggestedRent = computed(() => input.monthlyRent !== null && input.moveInDate ? suggestCurrentMonthRent(input.monthlyRent, input.moveInDate) : null)
const profile = computed(() => propertyProfileLines(input.property, zh.value))
const specs = computed(() => {
  const values: string[] = []
  if (input.property.layout.trim()) values.push(input.property.layout.trim())
  if (input.property.area !== null) values.push(`${input.property.area}㎡`)
  if (input.property.station.trim()) values.push(`${input.property.station.trim()}${input.property.walkMinutes === null ? '' : ` ${copy.value.walk}${input.property.walkMinutes}${copy.value.min}`}`)
  if (input.property.buildingAge !== null) values.push(`${zh.value ? '建筑' : '築'}${input.property.buildingAge}${copy.value.years}`)
  return values
})
const clientText = computed(() => {
  if (!hasInput()) return ''
  const lines = [`【${copy.value.property}】`, ...profile.value]
  if (input.monthlyRent !== null) lines.push(`${copy.value.rent}：${formatYen(input.monthlyRent, zh.value)}`)
  if (input.moveInDate) lines.push(`${copy.value.date}：${input.moveInDate.replace(/-/g, '/')}`)
  lines.push('', `【${copy.value.fees}】`)
  for (const item of report.value.items) lines.push(`${item.isCustom ? item.label : itemLabel(item.key as RentalCostItemKey, zh.value)}：${formatYen(item.amount, zh.value)}`)
  if (report.value.items.length) lines.push(`${copy.value.total}：${formatYen(report.value.total, zh.value)}`)
  if (report.value.materials.length) {
    lines.push('', `【${copy.value.materials}】`)
    for (const row of report.value.materials) lines.push(`・${row.isCustom ? row.label : materialLabel(row.key as RentalMaterialKey, zh.value)}`)
  }
  return lines.join('\n')
})

function setNumber(field: string, event: Event, group: 'property' | 'costs' | 'custom' | 'main') {
  const raw = (event.target as HTMLInputElement).value
  const number = raw === '' ? null : Number(raw)
  if (number !== null && (!Number.isFinite(number) || number < 0 || number > 50_000_000)) return
  if (group === 'main') input.monthlyRent = number
  else if (group === 'property') (input.property as unknown as Record<string, number | null>)[field] = number
  else if (group === 'costs') input.costs[field as RentalCostItemKey] = number
  else {
    const row = input.customCosts.find((item) => item.id === field)
    if (row) row.amount = number
  }
}
function addCost() { input.customCosts.push({ id: crypto.randomUUID(), label: '', amount: null }) }
function addMaterial() { input.customMaterials.push({ id: crypto.randomUUID(), label: '' }) }
function setMaterial(key: RentalMaterialKey, event: Event) {
  if ((event.target as HTMLInputElement).checked) input.materials.push(key)
  else input.materials = input.materials.filter((value) => value !== key)
}
function snapshot(): RentalCostInput { return JSON.parse(JSON.stringify(input)) as RentalCostInput }
function fingerprint() { return JSON.stringify(input) }
function hasInput() {
  const p = input.property
  return Boolean(p.name.trim() || p.address.trim() || p.station.trim() || p.layout.trim() || input.monthlyRent !== null || input.moveInDate ||
    [p.walkMinutes, p.area, p.buildingAge, p.managementFee].some((value) => value !== null) ||
    RENTAL_COST_ITEM_KEYS.some((key) => input.costs[key] !== null) || input.customCosts.length || input.materials.length || input.customMaterials.length)
}
function setCurrentId(value: string | null) {
  currentId.value = value
  if (value) localStorage.setItem(CURRENT_ID_KEY, value)
  else localStorage.removeItem(CURRENT_ID_KEY)
}
function dateTime(value: string) {
  const date = new Date(value)
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
function applyScenario(row: RentalCostScenario) {
  suppressSave = true
  Object.assign(input, blankInput(), JSON.parse(JSON.stringify(row.input)))
  setCurrentId(row.id)
  lastSavedFingerprint = `${row.id}:${fingerprint()}`
  pendingDelete.value = null
  suppressSave = false
}
async function saveCurrent() {
  if (!hasInput()) return
  const scenarioId = currentId.value ?? crypto.randomUUID()
  const key = `${scenarioId}:${fingerprint()}`
  if (key === lastSavedFingerprint) return writeChain
  const data = snapshot()
  setCurrentId(scenarioId)
  lastSavedFingerprint = key
  status.value = copy.value.saving
  const task = writeChain.catch(() => undefined).then(() => saveRentalScenario({ id: scenarioId, input: data, calculation: reportFor(data), ruleVersion: RENTAL_COST_RULES_VERSION }))
  writeChain = task
  try {
    const saved = await task
    history.value = [saved, ...history.value.filter((row) => row.id !== saved.id)].sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    status.value = `${copy.value.saved} ${dateTime(saved.savedAt).slice(11)}`
  } catch {
    lastSavedFingerprint = ''
    status.value = copy.value.saveError
  }
}
function scheduleSave() {
  if (suppressSave) return
  if (saveTimer) clearTimeout(saveTimer)
  if (hasInput()) saveTimer = setTimeout(() => { saveTimer = null; void saveCurrent() }, 900)
}
async function flushSave() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; await saveCurrent() }
  await writeChain.catch(() => undefined)
}
async function newProperty() {
  await flushSave()
  suppressSave = true
  Object.assign(input, blankInput())
  setCurrentId(null)
  lastSavedFingerprint = ''
  pendingDelete.value = null
  status.value = ''
  suppressSave = false
  document.getElementById('rental-name')?.focus()
}
async function loadScenario(row: RentalCostScenario) {
  await flushSave()
  applyScenario(row)
  status.value = `${copy.value.load}：${row.input.property.name || copy.value.unnamed}`
}
async function removeScenario(id: string) {
  if (pendingDelete.value !== id) { pendingDelete.value = id; return }
  await flushSave()
  try {
    await deleteRentalScenario(id)
    history.value = history.value.filter((row) => row.id !== id)
    if (currentId.value === id) {
      suppressSave = true
      Object.assign(input, blankInput())
      setCurrentId(null)
      lastSavedFingerprint = ''
      suppressSave = false
    }
    pendingDelete.value = null
    status.value = copy.value.deleted
  } catch { status.value = copy.value.saveError }
}
async function loadHistory() {
  try {
    history.value = await listRentalScenarios()
    const previous = history.value.find((row) => row.id === localStorage.getItem(CURRENT_ID_KEY))
    if (previous) applyScenario(previous)
    else setCurrentId(null)
  } catch { status.value = copy.value.loadError }
}
async function copyClientText() {
  try { await navigator.clipboard.writeText(clientText.value); ElMessage.success(copy.value.copied) }
  catch { ElMessage.error(zh.value ? '复制失败' : 'コピーできませんでした') }
}
function printReport() { window.print() }
watch(input, scheduleSave, { deep: true, flush: 'sync' })
onMounted(() => { trackEvent({ type: 'tool_view', toolId: 'rental' }); void loadHistory() })
onBeforeUnmount(() => { if (saveTimer) { clearTimeout(saveTimer); void saveCurrent() } })
</script>

<template>
  <div class="rental-page">
    <div class="rental-wrap">
      <div class="rental-left">
        <form class="form" autocomplete="off" @submit.prevent>
          <h2>{{ copy.input }}</h2>
          <div class="sub">{{ copy.property }}</div>
          <div class="field"><label for="rental-name">{{ copy.name }}</label><div class="inp"><input id="rental-name" v-model="input.property.name" maxlength="200"></div></div>
          <div class="field"><label for="rental-address">{{ copy.address }}</label><div class="inp"><input id="rental-address" v-model="input.property.address" maxlength="300"></div></div>
          <div class="field"><label for="rental-station">{{ copy.station }}</label><div class="inp"><input id="rental-station" v-model="input.property.station" maxlength="200"></div></div>
          <div class="field"><label for="rental-walk">{{ copy.walk }}</label><div class="inp"><input id="rental-walk" :value="input.property.walkMinutes ?? ''" type="number" min="0" max="999" @input="setNumber('walkMinutes', $event, 'property')"><span>{{ copy.min }}</span></div></div>
          <div class="field"><label for="rental-area">{{ copy.area }}</label><div class="inp"><input id="rental-area" :value="input.property.area ?? ''" type="number" min="0" step="any" @input="setNumber('area', $event, 'property')"><span>㎡</span></div></div>
          <div class="field"><label for="rental-layout">{{ copy.layout }}</label><div class="inp"><input id="rental-layout" v-model="input.property.layout" maxlength="80"></div></div>
          <div class="field"><label for="rental-age">{{ copy.age }}</label><div class="inp"><input id="rental-age" :value="input.property.buildingAge ?? ''" type="number" min="0" @input="setNumber('buildingAge', $event, 'property')"><span>{{ copy.years }}</span></div></div>
          <div class="field"><label for="rental-rent">{{ copy.rent }}</label><div class="inp"><input id="rental-rent" :value="input.monthlyRent ?? ''" type="number" min="0" @input="setNumber('monthlyRent', $event, 'main')"><span>{{ copy.yen }}</span></div></div>
          <div class="field"><label for="rental-management">{{ copy.management }}</label><div class="inp"><input id="rental-management" :value="input.property.managementFee ?? ''" type="number" min="0" @input="setNumber('managementFee', $event, 'property')"><span>{{ copy.yen }}</span></div></div>
          <div class="field"><label for="rental-date">{{ copy.date }}</label><div class="inp"><input id="rental-date" v-model="input.moveInDate" type="date"></div></div>
          <div class="sub">{{ copy.fees }}</div>
          <div v-for="key in RENTAL_COST_ITEM_KEYS" :key="key" class="field"><label :for="`rental-${key}`">{{ itemLabel(key, zh) }}</label><div class="inp"><input :id="`rental-${key}`" :value="input.costs[key] ?? ''" type="number" min="0" @input="setNumber(key, $event, 'costs')"><span>{{ copy.yen }}</span></div></div>
          <div v-if="suggestedRent !== null" class="prorated">{{ copy.prorated }} {{ formatYen(suggestedRent, zh) }} <button type="button" class="link" @click="input.costs.currentMonthRent = suggestedRent">{{ copy.apply }}</button></div>
          <div v-for="row in input.customCosts" :key="row.id" class="custom-row"><input v-model="row.label" :placeholder="copy.custom" maxlength="120"><div class="inp"><input :value="row.amount ?? ''" type="number" min="0" :aria-label="copy.amount" @input="setNumber(row.id, $event, 'custom')"><span>{{ copy.yen }}</span></div><button type="button" class="small danger" :aria-label="copy.remove" @click="input.customCosts = input.customCosts.filter((item) => item.id !== row.id)">×</button></div>
          <button type="button" class="link add" @click="addCost">{{ copy.addCost }}</button>
          <details class="materials"><summary>{{ copy.materials }}</summary><div class="material-list"><label v-for="key in RENTAL_MATERIAL_KEYS" :key="key"><input type="checkbox" :checked="input.materials.includes(key)" @change="setMaterial(key, $event)">{{ materialLabel(key, zh) }}</label></div><div v-for="row in input.customMaterials" :key="row.id" class="custom-row"><input v-model="row.label" :placeholder="copy.custom" maxlength="120"><button type="button" class="small danger" :aria-label="copy.remove" @click="input.customMaterials = input.customMaterials.filter((item) => item.id !== row.id)">×</button></div><button type="button" class="link add" @click="addMaterial">{{ copy.addMaterial }}</button></details>
        </form>
        <section class="hist" :aria-label="copy.history"><div class="hist-head"><h2>{{ copy.history }}</h2><button type="button" class="small" @click="newProperty">{{ copy.create }}</button></div><p class="status" aria-live="polite">{{ status }} <button v-if="status === copy.saveError" type="button" class="link" @click="saveCurrent">{{ copy.retry }}</button></p><ul v-if="history.length" class="hist-list"><li v-for="row in history" :key="row.id" :class="{ current: currentId === row.id }"><div class="hist-entry"><strong>{{ row.input.property.name || copy.unnamed }}</strong><span>{{ formatYen(row.calculation.total, zh) }} · {{ dateTime(row.savedAt) }}</span></div><div class="ops"><span v-if="currentId === row.id" class="tag">{{ copy.editing }}</span><button v-else type="button" class="small" @click="loadScenario(row)">{{ copy.load }}</button><button type="button" class="small danger" @click="removeScenario(row.id)">{{ pendingDelete === row.id ? copy.confirmDelete : copy.remove }}</button></div></li></ul><p v-else class="empty">{{ copy.empty }}</p></section>
      </div>
      <div class="rental-right">
        <div class="toolbar"><button type="button" class="button" @click="printReport">{{ copy.print }}</button></div>
        <article id="rental-report-card" class="card"><header class="card-head"><div class="eyebrow">{{ copy.report }}</div><h1>{{ input.property.name.trim() || copy.unnamed }}</h1><div v-if="specs.length" class="specs"><span v-for="value in specs" :key="value">{{ value }}</span></div><div class="meta">{{ input.property.address }}<template v-if="input.property.address"> · </template>{{ copy.dateLabel }} {{ new Date().toLocaleDateString('ja-JP') }}</div></header><div class="card-body"><div class="hero"><span>{{ copy.total }}</span><strong>{{ report.items.length ? formatYen(report.total, zh) : '—' }}</strong></div><section v-if="input.monthlyRent !== null || input.property.managementFee !== null || input.moveInDate" class="monthly"><h2>{{ copy.monthly }}</h2><div v-if="input.monthlyRent !== null"><span>{{ copy.rent }}</span><strong>{{ formatYen(input.monthlyRent, zh) }}</strong></div><div v-if="input.property.managementFee !== null"><span>{{ copy.management }}</span><strong>{{ formatYen(input.property.managementFee, zh) }}</strong></div><div v-if="input.moveInDate"><span>{{ copy.date }}</span><strong>{{ input.moveInDate.replace(/-/g, '/') }}</strong></div></section><section><h2>{{ copy.item }}</h2><table v-if="report.items.length"><tbody><tr v-for="row in report.items" :key="row.key"><td>{{ row.isCustom ? row.label : itemLabel(row.key as RentalCostItemKey, zh) }}</td><td>{{ formatYen(row.amount, zh) }}</td></tr><tr class="total"><td>{{ copy.total }}</td><td>{{ formatYen(report.total, zh) }}</td></tr></tbody></table><p v-else class="empty">{{ copy.noFees }}</p></section><section v-if="report.materials.length"><h2>{{ copy.materials }}</h2><ul class="report-materials"><li v-for="row in report.materials" :key="row.key">{{ row.isCustom ? row.label : materialLabel(row.key as RentalMaterialKey, zh) }}</li></ul></section></div></article>
        <section class="customer-panel"><div class="customer-head"><h2>{{ copy.customer }}</h2><button type="button" class="button" @click="copyClientText">{{ copy.copy }}</button></div><textarea :value="clientText" readonly :rows="Math.min(18, Math.max(8, clientText.split('\n').length))"></textarea></section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rental-page{--bg:#eef1f3;--panel:#fff;--ink:#18222c;--muted:#5e6b76;--line:#d9dfe4;--accent:#1d5b74;--accent-soft:#e3eef2;--neg:#a1452f;min-height:100vh;background:var(--bg);color:var(--ink);font:14px/1.6 'Noto Sans SC','PingFang SC','Hiragino Sans',system-ui,sans-serif}.rental-page *{box-sizing:border-box}.rental-wrap{max-width:1080px;margin:auto;padding:28px 16px 48px;display:grid;grid-template-columns:340px minmax(0,1fr);gap:28px;align-items:start}.rental-left,.rental-right{display:flex;flex-direction:column;gap:16px;min-width:0}.form,.hist,.customer-panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:20px}.form{display:flex;flex-direction:column;gap:10px}.form h2,.hist h2,.customer-panel h2{font-size:15px;margin:0;font-weight:700}.sub{font-size:12px;color:var(--muted);padding-top:12px;border-top:1px dashed var(--line);margin-top:6px;font-weight:700}.field{display:grid;grid-template-columns:112px minmax(0,1fr);align-items:center;gap:10px}.field label{font-size:12.5px;color:var(--muted);font-weight:500;line-height:1.35}.inp{display:flex;align-items:center;height:38px;border:1px solid var(--line);border-radius:6px;background:#fff;min-width:0}.inp:focus-within,.custom-row>input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}.inp input{flex:1;min-width:0;width:100%;height:100%;border:0;outline:0;padding:0 10px;font:inherit;font-size:14px;background:transparent;color:var(--ink)}.inp input[type=number]{text-align:right;appearance:textfield}.inp input::-webkit-inner-spin-button{appearance:none}.inp span{flex:none;padding-right:10px;color:var(--muted);font-size:12px}.prorated{margin:-6px 0 2px 122px;font-size:11.5px;color:var(--muted)}.link{border:0;background:none;color:var(--accent);font:inherit;cursor:pointer;padding:0}.link:hover{text-decoration:underline}.add{align-self:flex-start;font-size:12.5px}.custom-row{display:flex;gap:5px;align-items:center}.custom-row>input{width:44%;min-width:0;height:38px;border:1px solid var(--line);border-radius:6px;padding:0 9px;font:inherit}.custom-row .inp{flex:1}.small{font:inherit;font-size:12px;color:var(--accent);background:#fff;border:1px solid var(--line);border-radius:5px;padding:4px 8px;cursor:pointer;white-space:nowrap}.small:hover{border-color:var(--accent)}.danger{color:var(--neg)}.materials{border-top:1px dashed var(--line);padding-top:10px;margin-top:6px}.materials summary{cursor:pointer;font-size:12.5px;font-weight:700;color:var(--muted)}.material-list{display:grid;gap:5px;margin:10px 0}.material-list label{font-size:12.5px;display:flex;gap:7px;align-items:center}.material-list input{accent-color:var(--accent)}.materials .custom-row{margin:6px 0}.hist{display:flex;flex-direction:column;gap:10px}.hist-head,.customer-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.status{font-size:12px;color:var(--accent);margin:0}.status:empty{display:none}.hist-list{list-style:none;margin:0;padding:0;max-height:360px;overflow-y:auto}.hist-list li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)}.hist-list li:last-child{border:0}.hist-entry{min-width:0;display:flex;flex-direction:column}.hist-entry strong{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hist-entry span{font-size:11px;color:var(--muted)}.ops{display:flex;gap:4px}.tag{font-size:11px;color:var(--accent)}.current .hist-entry strong{color:var(--accent)}.empty{color:var(--muted);font-size:12.5px;margin:0}.toolbar{display:flex;justify-content:flex-end}.button{font:inherit;font-size:13px;font-weight:500;color:#fff;background:var(--accent);border:0;border-radius:6px;padding:9px 16px;cursor:pointer}.button:hover{filter:brightness(1.1)}.card{background:#fff;border-radius:4px;box-shadow:0 1px 2px rgba(24,34,44,.06),0 8px 28px rgba(24,34,44,.08);overflow:hidden}.card-head{background:var(--accent);color:#fff;padding:22px 28px 20px}.eyebrow{font-size:11px;letter-spacing:.14em;opacity:.75}.card-head h1{margin:4px 0 2px;font-family:'Noto Serif SC','Songti SC',serif;font-size:26px;color:#fff}.specs{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.specs span{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);border-radius:3px;padding:2px 9px;font-size:12px}.meta{font-size:12px;opacity:.8}.card-body{padding:22px 28px 26px;display:flex;flex-direction:column;gap:20px}.hero{border:1px solid var(--line);background:var(--accent-soft);padding:14px 18px;display:flex;align-items:baseline;justify-content:space-between;gap:12px}.hero span{font-size:12px;color:var(--accent);font-weight:700}.hero strong{font-family:ui-monospace,monospace;font-size:30px;color:var(--accent);font-variant-numeric:tabular-nums}.card h2{font-size:13px;margin:0 0 8px}.monthly>div{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--line);font-size:13px}.monthly strong{font-weight:500}.card table{width:100%;border-collapse:collapse}.card td{font-size:13px;padding:7px 0;border-bottom:1px solid var(--line)}.card td:last-child{text-align:right;white-space:nowrap;font-family:ui-monospace,monospace;font-variant-numeric:tabular-nums}.card tr.total td{border-bottom:0;border-top:2px solid var(--ink);font-weight:700;padding-top:10px}.report-materials{margin:0;padding-left:20px;font-size:13px;columns:2}.report-materials li{break-inside:avoid;margin-bottom:4px}.customer-panel{display:flex;flex-direction:column;gap:12px}.customer-panel textarea{width:100%;resize:vertical;border:1px solid var(--line);border-radius:6px;padding:12px;font-family:inherit;font-size:13px;line-height:1.7;color:var(--ink);background:#fff}@media(max-width:820px){.rental-wrap{grid-template-columns:1fr}}@media(max-width:380px){.field{grid-template-columns:1fr;gap:4px}.prorated{margin-left:0}}@media print{.rental-page{background:#fff;min-height:0}.rental-wrap{display:block;max-width:none;padding:0}.rental-left,.toolbar,.customer-panel{display:none!important}.rental-right{display:block}.card{box-shadow:none;border-radius:0}.card-head{padding:14px 18px}.card-body{padding:18px}.card section,.card table tr{break-inside:avoid}}
</style>
