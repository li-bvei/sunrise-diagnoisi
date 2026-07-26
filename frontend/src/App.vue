<script setup lang="ts">
import { computed } from 'vue'
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
      weeksFull: {
        sun: '日曜日', mon: '月曜日', tue: '火曜日', wed: '水曜日',
        thu: '木曜日', fri: '金曜日', sat: '土曜日',
      },
    },
  },
}
const elementLocale = computed(() => settings.locale === 'zh-CN' ? zhCnNumericDates : jaNumericDates)
</script>

<template>
  <el-config-provider :locale="elementLocale">
    <RouterView />
  </el-config-provider>
</template>
