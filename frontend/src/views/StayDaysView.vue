<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Download, Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import PracticalToolHero from '@/components/practical/PracticalToolHero.vue'
import { practicalToolMessages } from '@/data/practicalToolMessages'
import { useSettingsStore } from '@/stores/settings'
import type { TravelRecord, TravelRecordDraft } from '@/types/stayRecords'
import { inJapanDaysBetween, recordsToCsv, summarizePeriod, summarizeStayByYear, travelDays, validateTravelPeriod } from '@/utils/stayCalculator'
import { loadTravelRecords, saveTravelRecords } from '@/utils/stayStorage'

const settings = useSettingsStore()
const copy = computed(() => practicalToolMessages[settings.locale])
const records = ref(loadTravelRecords())
const dialogOpen = ref(false)
const editingId = ref<string | null>(null)
const sortOrder = ref<'desc' | 'asc'>('desc')
const today = new Date().toISOString().slice(0, 10)
const draft = reactive<TravelRecordDraft>({ exitDate: today, entryDate: today, exitPort: '', entryPort: '', note: '' })
const period = reactive({ startDate: `${new Date().getFullYear()}-01-01`, endDate: today })
const summaries = computed(() => summarizeStayByYear(records.value))
const periodSummary = computed(() => summarizePeriod(records.value, period.startDate, period.endDate))
const recordsWithIntervals = computed(() => {
  const chronological = [...records.value].sort((a, b) => a.exitDate.localeCompare(b.exitDate))
  return chronological.map((record, index) => ({
    ...record,
    inJapanInterval: index === 0 ? null : inJapanDaysBetween(chronological[index - 1]!.entryDate, record.exitDate),
  }))
})
const sortedRecords = computed(() => [...recordsWithIntervals.value].sort((a, b) => sortOrder.value === 'desc' ? b.exitDate.localeCompare(a.exitDate) : a.exitDate.localeCompare(b.exitDate)))

function resetDraft() {
  Object.assign(draft, { exitDate: today, entryDate: today, exitPort: '', entryPort: '', note: '' })
  editingId.value = null
}
function openAdd() { resetDraft(); dialogOpen.value = true }
function openEdit(record: TravelRecord) { editingId.value = record.id; Object.assign(draft, record); dialogOpen.value = true }
function persist() {
  if (!saveTravelRecords(records.value)) ElMessage.warning(copy.value.common.saveFailed)
}
function saveRecord() {
  if (!validateTravelPeriod(draft.exitDate, draft.entryDate)) { ElMessage.error(copy.value.stay.invalid); return }
  if (editingId.value) {
    const index = records.value.findIndex((item) => item.id === editingId.value)
    if (index >= 0) records.value[index] = { id: editingId.value, ...draft }
  } else {
    records.value.push({ id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, ...draft })
  }
  persist(); dialogOpen.value = false; ElMessage.success(copy.value.stay.saved)
}
function removeRecord(id: string) { records.value = records.value.filter((item) => item.id !== id); persist() }
function exportCsv() {
  const blob = new Blob([recordsToCsv(sortedRecords.value)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = `sunrise-stay-records-${today}.csv`; link.click(); URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="page-surface">
    <PracticalToolHero :eyebrow="copy.stay.eyebrow" :title="copy.stay.title" :description="copy.stay.description" />
    <section class="section practical-section"><div class="container practical-stack">
      <el-alert type="info" :closable="false" show-icon :title="copy.stay.localOnly" />
      <div class="stay-toolbar"><h2>{{ copy.stay.summary }}</h2><div><el-button :icon="Download" :disabled="!records.length" @click="exportCsv">{{ copy.stay.export }}</el-button><el-button type="primary" :icon="Plus" @click="openAdd">{{ copy.stay.add }}</el-button></div></div>

      <div v-if="summaries.length" class="year-summary-grid">
        <article v-for="summary in summaries" :key="summary.year" class="year-summary-card">
          <strong>{{ summary.year }}</strong>
          <div><span>{{ copy.stay.inJapan }}</span><b>{{ summary.inJapanDays }}</b></div>
          <div><span>{{ copy.stay.away }}</span><b>{{ summary.awayDays }}</b></div>
          <small>{{ copy.stay.trips }} {{ summary.tripCount }} · {{ copy.stay.longest }} {{ summary.longestAwayDays }}</small>
        </article>
      </div>
      <el-empty v-else :description="copy.stay.empty" />

      <el-card shadow="never" class="practical-panel">
        <template #header><strong>{{ copy.stay.period }}</strong></template>
        <div class="period-grid">
          <el-date-picker v-model="period.startDate" type="date" value-format="YYYY-MM-DD" :placeholder="copy.stay.start" />
          <el-date-picker v-model="period.endDate" type="date" value-format="YYYY-MM-DD" :placeholder="copy.stay.end" />
          <div v-if="periodSummary" class="period-result"><span>{{ copy.stay.total }} {{ periodSummary.totalDays }}</span><strong>{{ copy.stay.inJapan }} {{ periodSummary.japanDays }} / {{ copy.stay.away }} {{ periodSummary.abroadDays }}</strong></div>
        </div>
      </el-card>

      <div class="stay-toolbar"><h2>{{ copy.stay.records }}</h2><el-select v-model="sortOrder" class="stay-sort"><el-option :label="copy.stay.sortNewest" value="desc" /><el-option :label="copy.stay.sortOldest" value="asc" /></el-select></div>
      <div class="travel-record-list">
        <article v-for="record in sortedRecords" :key="record.id" class="travel-record-card">
          <div class="record-route"><strong>{{ record.exitDate }} → {{ record.entryDate }}</strong><el-tag>{{ travelDays(record.exitDate, record.entryDate) }} {{ copy.stay.days }}</el-tag></div>
          <p v-if="record.exitPort || record.entryPort">{{ record.exitPort || '—' }} → {{ record.entryPort || '—' }}</p>
          <p v-if="record.inJapanInterval !== null">{{ copy.stay.inJapanInterval }}：{{ record.inJapanInterval }}</p>
          <p v-if="record.note">{{ record.note }}</p>
          <div class="record-actions"><el-button text :icon="Edit" @click="openEdit(record)">{{ copy.stay.edit }}</el-button><el-button text type="danger" :icon="Delete" @click="removeRecord(record.id)">{{ copy.stay.remove }}</el-button></div>
        </article>
      </div>

      <el-dialog v-model="dialogOpen" :title="editingId ? copy.stay.edit : copy.stay.add" width="min(520px, calc(100vw - 28px))">
        <el-form label-position="top"><div class="practical-form-grid">
          <el-form-item :label="copy.stay.exitDate"><el-date-picker v-model="draft.exitDate" type="date" value-format="YYYY-MM-DD" /></el-form-item>
          <el-form-item :label="copy.stay.entryDate"><el-date-picker v-model="draft.entryDate" type="date" value-format="YYYY-MM-DD" /></el-form-item>
          <el-form-item :label="copy.stay.exitPort"><el-input v-model="draft.exitPort" /></el-form-item>
          <el-form-item :label="copy.stay.entryPort"><el-input v-model="draft.entryPort" /></el-form-item>
        </div><el-form-item :label="copy.stay.note"><el-input v-model="draft.note" type="textarea" :rows="3" /></el-form-item></el-form>
        <template #footer><el-button @click="dialogOpen = false">{{ copy.common.cancel }}</el-button><el-button type="primary" @click="saveRecord">{{ copy.common.save }}</el-button></template>
      </el-dialog>
    </div></section>
  </div>
</template>
