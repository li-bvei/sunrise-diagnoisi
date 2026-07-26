<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import ja from 'element-plus/es/locale/lang/ja'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const numericMonths = {
  jan: '1月', feb: '2月', mar: '3月', apr: '4月', may: '5月', jun: '6月',
  jul: '7月', aug: '8月', sep: '9月', oct: '10月', nov: '11月', dec: '12月',
}
const zhCnNumericDates = {
  ...zhCn,
  el: {
    ...zhCn.el,
    datepicker: {
      ...zhCn.el.datepicker,
      month1: '1月', month2: '2月', month3: '3月', month4: '4月',
      month5: '5月', month6: '6月', month7: '7月', month8: '8月',
      month9: '9月', month10: '10月', month11: '11月', month12: '12月',
      months: numericMonths,
      weeks: { sun: '日', mon: '一', tue: '二', wed: '三', thu: '四', fri: '五', sat: '六' },
    },
  },
}
const jaNumericDates = {
  ...ja,
  el: {
    ...ja.el,
    datepicker: {
      ...ja.el.datepicker,
      months: numericMonths,
      dateTablePrompt: '方向キーとEnterキーで日付を選択してください',
      monthTablePrompt: '方向キーとEnterキーで月を選択してください',
      yearTablePrompt: '方向キーとEnterキーで年を選択してください',
      selectedDate: '選択した日付',
      weeksFull: {
        sun: '日曜日', mon: '月曜日', tue: '火曜日', wed: '水曜日',
        thu: '木曜日', fri: '金曜日', sat: '土曜日',
      },
    },
  },
}
const elementLocale = computed(() => settings.locale === 'zh-CN' ? zhCnNumericDates : jaNumericDates)

let pickerTitleObserver: MutationObserver | undefined
function normalizePickerTitles() {
  document.querySelectorAll<HTMLElement>('.el-date-picker__header-label').forEach((label) => {
    const normalized = label.textContent
      ?.replace(/(\d)\s+年/g, '$1年')
      .replace(/^(\d{1,2})\s*月$/, '$1月')
    if (normalized && normalized !== label.textContent) label.textContent = normalized
  })
}
onMounted(() => {
  pickerTitleObserver = new MutationObserver(normalizePickerTitles)
  pickerTitleObserver.observe(document.body, { childList: true, subtree: true, characterData: true })
  normalizePickerTitles()
})
onBeforeUnmount(() => pickerTitleObserver?.disconnect())
</script>

<template>
  <el-config-provider :locale="elementLocale">
    <RouterView />
  </el-config-provider>
</template>
