<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps<{ page: 'privacy' | 'terms' | 'disclaimer' }>()
const settings = useSettingsStore()

const content = computed(() => {
  const zh = {
    privacy: ['隐私政策', '正式政策将在服务上线前公布', 'SUNRISE 重视客户个人信息。本页将在收集、使用或保存诊断信息前，完整说明使用目的、保存期限、安全措施、第三方提供及客户权利。当前版本不会提交或保存任何个人信息。'],
    terms: ['使用条款', '正式条款将在服务上线前公布', '本页将说明服务适用范围、用户责任、知识产权、服务变更与停止等事项。当前展示内容仅用于确认第一版界面与信息结构。'],
    disclaimer: ['免责声明', '在线诊断仅供初步参考', '诊断结果不构成行政许可、法律、税务或其他专业意见，也不保证任何申请或审批结果。制度与实务可能变化，重要决定前请由专业人员确认。'],
  }
  const ja = {
    privacy: ['プライバシーポリシー', '正式な方針はサービス公開前に掲載します', 'SUNRISEはお客様の個人情報を大切に取り扱います。本ページでは、診断情報を収集・利用・保存する前に、利用目的、保存期間、安全管理、第三者提供、お客様の権利を明示します。現在のバージョンでは個人情報の送信・保存は行いません。'],
    terms: ['利用規約', '正式な規約はサービス公開前に掲載します', '本ページでは、サービスの適用範囲、利用者の責任、知的財産、サービスの変更・停止などを定めます。現在の内容は、初期版の画面と情報構成をご確認いただくためのものです。'],
    disclaimer: ['免責事項', 'オンライン診断は初期判断の参考情報です', '診断結果は、行政許可、法律、税務その他の専門的助言を構成せず、申請や審査の結果を保証するものではありません。制度や実務は変更される場合があるため、重要な判断の前に専門家へご確認ください。'],
  }
  return settings.locale === 'zh-CN' ? zh[props.page] : ja[props.page]
})
</script>

<template>
  <div class="page-surface">
    <section class="page-hero compact"><div class="container"><span class="eyebrow">SUNRISE POLICY</span><h1>{{ content[0] }}</h1><p>{{ content[1] }}</p></div></section>
    <section class="section"><div class="container legal-card"><h2>{{ content[1] }}</h2><p>{{ content[2] }}</p><div class="legal-meta">{{ settings.locale === 'zh-CN' ? '最后更新：第一版设计确认阶段' : '最終更新：初期デザイン確認段階' }}</div></div></section>
  </div>
</template>
