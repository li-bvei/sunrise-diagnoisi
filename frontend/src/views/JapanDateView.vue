<script setup lang="ts">
import { computed, ref } from 'vue'
import { Calendar, Clock } from '@element-plus/icons-vue'
import { useSettingsStore } from '@/stores/settings'
import {
  addCalendarDays, addJapaneseBusinessDays, calendarDayDifference,
  countJapaneseBusinessDays, isJapanesePublicHoliday,
} from '@/utils/japanDateCalculator'

const settings = useSettingsStore()
const zh = computed(() => settings.locale === 'zh-CN')
const today = new Date()
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const startDate = ref(todayKey)
const endDate = ref(todayKey)
const addStartDate = ref(todayKey)
const amount = ref(10)
const dayType = ref<'calendar' | 'business'>('business')

const elapsedDays = computed(() => calendarDayDifference(startDate.value, endDate.value))
const businessDays = computed(() => countJapaneseBusinessDays(startDate.value, endDate.value))
const addedDate = computed(() => dayType.value === 'business'
  ? addJapaneseBusinessDays(addStartDate.value, amount.value)
  : addCalendarDays(addStartDate.value, amount.value))
const holidayLabel = computed(() => zh.value ? '日本法定节假日' : '日本の祝日')

function formatDate(value: string) {
  const [year = 1970, month = 1, day = 1] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const weekday = new Intl.DateTimeFormat(zh.value ? 'zh-CN' : 'ja-JP', { weekday: 'long' }).format(date)
  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}（${weekday}）`
}
</script>

<template>
  <div class="page-surface calculator-page japan-date-page">
    <section class="calculator-hero">
      <div class="container calculator-hero-grid"><div>
        <span class="eyebrow">{{ zh ? '日期工具' : '日付ツール' }}</span>
        <h1>{{ zh ? '日本日期与工作日' : '日本の日付・営業日計算' }}</h1>
        <p>{{ zh ? '查看日期间隔，或计算经过指定天数后的日期。工作日计算会排除周末和日本法定节假日。' : '日付の期間や指定日数後の日付を計算します。営業日数からは土日と日本の祝日を除きます。' }}</p>
      </div></div>
    </section>

    <section class="section calculator-section"><div class="container japan-date-shell">
      <article class="calculator-panel japan-date-panel">
        <div class="panel-heading"><span><el-icon><Calendar /></el-icon></span><div><h2>{{ zh ? '日期间隔' : '日付の期間' }}</h2><p>{{ zh ? '工作日数包含起始日和结束日。' : '営業日数は開始日と終了日を含みます。' }}</p></div></div>
        <div class="form-grid">
          <el-form-item :label="zh ? '开始日期' : '開始日'"><el-date-picker v-model="startDate" type="date" value-format="YYYY-MM-DD" format="YYYY/MM/DD" /></el-form-item>
          <el-form-item :label="zh ? '结束日期' : '終了日'"><el-date-picker v-model="endDate" type="date" value-format="YYYY-MM-DD" format="YYYY/MM/DD" /></el-form-item>
        </div>
        <div class="date-results">
          <div><span>{{ zh ? '日期间隔' : '日付の差' }}</span><strong>{{ Math.abs(elapsedDays) }} {{ zh ? '天' : '日' }}</strong></div>
          <div><span>{{ zh ? '工作日（含首尾）' : '営業日（両端を含む）' }}</span><strong>{{ businessDays }} {{ zh ? '天' : '日' }}</strong></div>
        </div>
        <div class="holiday-statuses">
          <div v-for="date in [...new Set([startDate, endDate])]" :key="date">
            <span>{{ formatDate(date) }}</span>
            <el-tag v-if="isJapanesePublicHoliday(date)" type="warning" effect="light">{{ holidayLabel }}</el-tag>
            <el-tag v-else-if="[0, 6].includes(new Date(`${date}T00:00:00`).getDay())" effect="plain">{{ zh ? '周末' : '土日' }}</el-tag>
            <el-tag v-else type="success" effect="plain">{{ zh ? '工作日' : '営業日' }}</el-tag>
          </div>
        </div>
      </article>

      <article class="calculator-panel japan-date-panel">
        <div class="panel-heading"><span><el-icon><Clock /></el-icon></span><div><h2>{{ zh ? '计算指定天数后的日期' : '指定日数後の日付' }}</h2><p>{{ zh ? '工作日模式会从次日开始计数。' : '営業日モードでは翌日から数えます。' }}</p></div></div>
        <div class="form-grid date-add-grid">
          <el-form-item :label="zh ? '起始日期' : '開始日'"><el-date-picker v-model="addStartDate" type="date" value-format="YYYY-MM-DD" format="YYYY/MM/DD" /></el-form-item>
          <el-form-item :label="zh ? '天数' : '日数'"><el-input-number v-model="amount" :min="-3650" :max="3650" controls-position="right" /></el-form-item>
          <el-form-item :label="zh ? '计算方式' : '計算方法'">
            <el-radio-group v-model="dayType" class="date-mode-switch">
              <el-radio-button value="business">{{ zh ? '工作日' : '営業日' }}</el-radio-button>
              <el-radio-button value="calendar">{{ zh ? '自然日' : '暦日' }}</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </div>
        <div class="date-added-result">
          <span>{{ zh ? '计算结果' : '計算結果' }}</span>
          <strong>{{ formatDate(addedDate) }}</strong>
          <el-tag v-if="isJapanesePublicHoliday(addedDate)" type="warning" effect="light">{{ holidayLabel }}</el-tag>
        </div>
      </article>
    </div></section>
  </div>
</template>
