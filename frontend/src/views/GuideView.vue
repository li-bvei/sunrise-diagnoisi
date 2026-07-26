<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const copy = computed(() => settings.locale === 'zh-CN' ? {
  eyebrow: '使用说明',
  title: '安心使用专业诊断工具',
  description: '了解诊断流程、信息使用方式和结果的适用范围。',
  steps: [
    ['1', '选择诊断工具', '请根据当前需要，从在留、不动产、公司经营、工资或年金等领域选择工具。'],
    ['2', '按步骤填写信息', '正式版本只会收集本次诊断需要的信息。姓名和电话为统一必填项，出生日期仅在必要时显示。'],
    ['3', '确认初步结果', '结果会提供计算明细、判断依据、注意事项与下一步建议。'],
    ['4', '必要时进行人工确认', '制度适用或事实关系复杂时，请联系 SUNRISE 进行专业确认。'],
  ],
  privacyTitle: '关于个人信息',
  privacy: '我们坚持最小必要原则。不会统一要求邮箱、LINE、微信或地址，也不会为不需要生日的工具强制收集出生日期。正式提交前将提供个人信息使用说明与同意确认。',
  resultTitle: '关于诊断结果',
  result: '在线结果用于初步整理条件和费用，不构成行政许可、税务或法律意见，也不代表成功率或任何结果保证。规则将随日本制度变化持续更新。',
} : {
  eyebrow: 'ご利用案内',
  title: '専門診断ツールを安心してご利用いただくために',
  description: '診断の流れ、情報の取り扱い、結果の適用範囲をご案内します。',
  steps: [
    ['1', '診断ツールを選択', '在留、不動産、会社経営、給与、年金など、現在の目的に合うツールを選択します。'],
    ['2', '案内に沿って情報を入力', '正式版では診断に必要な情報のみを収集します。氏名と電話番号は共通項目とし、生年月日は必要な場合にのみ表示します。'],
    ['3', '初期診断の結果を確認', '計算内訳、判断根拠、注意事項、次のステップをご確認いただけます。'],
    ['4', '必要に応じて専門スタッフへ相談', '制度の適用や事実関係が複雑な場合は、SUNRISEによる個別確認をご利用ください。'],
  ],
  privacyTitle: '個人情報について',
  privacy: '必要最小限の情報のみを取り扱います。メール、LINE、WeChat、住所を一律に求めることはなく、生年月日が不要なツールでは入力を必須にしません。正式な送信前に利用目的と同意確認を表示します。',
  resultTitle: '診断結果について',
  result: 'オンライン診断は条件や費用を整理するための初期判断であり、行政許可、税務・法律上の助言、成功率や結果を保証するものではありません。制度改正に応じてルールを更新します。',
})
</script>

<template>
  <div class="page-surface">
    <section class="page-hero compact"><div class="container"><span class="eyebrow">{{ copy.eyebrow }}</span><h1>{{ copy.title }}</h1><p>{{ copy.description }}</p></div></section>
    <section class="section">
      <div class="container guide-grid">
        <article v-for="step in copy.steps" :key="step[0]" class="guide-step"><span>{{ step[0] }}</span><div><h2>{{ step[1] }}</h2><p>{{ step[2] }}</p></div></article>
      </div>
      <div class="container guide-notes">
        <article><h2>{{ copy.privacyTitle }}</h2><p>{{ copy.privacy }}</p></article>
        <article><h2>{{ copy.resultTitle }}</h2><p>{{ copy.result }}</p></article>
      </div>
    </section>
  </div>
</template>
