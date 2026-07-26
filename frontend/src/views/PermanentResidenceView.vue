<script setup lang="ts">
import { computed, ref } from 'vue'
import { Clock, Document, DocumentChecked, List, Warning } from '@element-plus/icons-vue'
import ComingSoonDialog from '@/components/ComingSoonDialog.vue'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const dialogOpen = ref(false)
const copy = computed(() => settings.locale === 'zh-CN' ? {
  category: '在留・永住',
  title: '永住申请条件诊断',
  intro: '独立确认一般永住、高度人才永住等路径涉及的在留年限、纳税与社会保险、品行和其他基础条件。',
  badge: '即将上线',
  duration: '约 8～10 分钟',
  confirmTitle: '计划确认的内容',
  confirm: ['适用的永住路径', '在留年限与连续性', '税金及社会保险缴纳情况', '需要人工确认的风险项目'],
  prepareTitle: '建议提前准备',
  prepare: ['当前在留资格与在留期间', '日本居住和工作经历', '税金、年金及健康保险记录', '家庭关系及身元保证相关信息'],
  resultTitle: '未来结果将包含',
  results: ['条件完成度', '时间要求', '风险提示', '材料准备方向'],
  noticeTitle: '与高度人才积分工具完全独立',
  notice: '本工具不会与高度人才积分计算合并。高度人才积分仅作为永住路径可能涉及的一项事实，永住许可仍需独立审查全部条件。',
  statusTitle: '当前状态',
  status: '永住申请条件规则与分步问答即将上线。目前可先使用独立的高度人才积分计算工具。',
} : {
  category: '在留・永住',
  title: '永住許可要件診断',
  intro: '一般永住、高度人材からの永住など、適用可能な経路ごとに在留年数、納税・社会保険、素行その他の基本条件を確認します。',
  badge: '近日公開',
  duration: '約8～10分',
  confirmTitle: '確認予定の内容',
  confirm: ['適用可能な永住経路', '在留年数と継続性', '税金・社会保険の納付状況', '専門スタッフの確認が必要なリスク'],
  prepareTitle: '事前にご用意いただく情報',
  prepare: ['現在の在留資格と在留期間', '日本での居住・就労履歴', '税金・年金・健康保険の記録', '家族関係・身元保証に関する情報'],
  resultTitle: '診断結果に含まれる予定の内容',
  results: ['要件の充足状況', '期間要件', 'リスク', '必要書類の方向性'],
  noticeTitle: '高度人材ポイント計算とは完全に分離',
  notice: '本ツールは高度人材ポイント計算と統合しません。ポイントは永住経路で考慮される事実の一つであり、永住許可ではすべての要件が個別に審査されます。',
  statusTitle: '現在の状況',
  status: '永住許可要件のルールと段階式質問は近日公開予定です。高度人材ポイント計算は現在ご利用いただけます。',
})
</script>

<template>
  <div class="page-surface">
    <section class="detail-hero">
      <div class="container detail-hero-grid">
        <div>
          <span class="eyebrow">{{ copy.category }}</span>
          <h1>{{ copy.title }}</h1>
          <p>{{ copy.intro }}</p>
          <div class="detail-tags"><el-tag type="info" round>{{ copy.badge }}</el-tag><span><el-icon><Clock /></el-icon>{{ copy.duration }}</span></div>
          <div class="hero-actions">
            <el-button type="primary" size="large" @click="dialogOpen = true">{{ settings.dictionary.common.start }}</el-button>
            <el-button size="large" @click="$router.push('/tools')">{{ settings.dictionary.common.backTools }}</el-button>
          </div>
        </div>
        <aside class="detail-status-card">
          <span class="preview-label">{{ copy.statusTitle }}</span>
          <span class="status-line"><i></i>{{ copy.badge }}</span>
          <p>{{ copy.status }}</p>
        </aside>
      </div>
    </section>
    <section class="section">
      <div class="container detail-content">
        <article class="detail-block"><span class="detail-icon"><el-icon><List /></el-icon></span><h2>{{ copy.confirmTitle }}</h2><ul><li v-for="item in copy.confirm" :key="item">{{ item }}</li></ul></article>
        <article class="detail-block"><span class="detail-icon"><el-icon><Document /></el-icon></span><h2>{{ copy.prepareTitle }}</h2><ul><li v-for="item in copy.prepare" :key="item">{{ item }}</li></ul></article>
        <article class="detail-block"><span class="detail-icon"><el-icon><DocumentChecked /></el-icon></span><h2>{{ copy.resultTitle }}</h2><ul><li v-for="item in copy.results" :key="item">{{ item }}</li></ul></article>
        <article class="detail-block notice-block"><span class="detail-icon"><el-icon><Warning /></el-icon></span><h2>{{ copy.noticeTitle }}</h2><p>{{ copy.notice }}</p></article>
      </div>
    </section>
    <ComingSoonDialog v-model="dialogOpen" specialized />
  </div>
</template>
