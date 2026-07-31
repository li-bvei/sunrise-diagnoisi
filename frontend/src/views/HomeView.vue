<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Check, CircleCheck, InfoFilled, Warning } from '@element-plus/icons-vue'
import SectionHeading from '@/components/SectionHeading.vue'
import ToolCard from '@/components/ToolCard.vue'
import ComingSoonDialog from '@/components/ComingSoonDialog.vue'
import { categories, tools } from '@/data/tools'
import type { DiagnosisTool } from '@/types/content'
import { iconMap, type IconName } from '@/utils/icons'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const router = useRouter()
const dialogOpen = ref(false)

const copy = computed(() => settings.locale === 'zh-CN' ? {
  heroEyebrow: '面向在日生活与经营的专业工具',
  title: 'SUNRISE 专业诊断中心',
  subtitle: '通过简单问答，初步确认在留、永住、不动产、公司经营、工资及年金相关条件与费用。',
  tags: ['免费使用', '无需注册账号', '约 3～10 分钟', '结果仅供初步参考'],
  start: '开始专业诊断',
  demo: '界面示意',
  demoStatus: '当前诊断状态',
  demoStatusValue: '条件确认完成',
  demoResult: '预计结果',
  demoResultValue: '符合进一步确认条件',
  demoItems: ['基础条件已确认', '部分材料需要补充', '建议由专业人员复核'],
  demoNext: '下一步建议',
  demoNextValue: '整理材料后联系 SUNRISE 进行人工确认',
  categoryEyebrow: '诊断领域',
  categoryTitle: '从您当前关心的事项开始',
  categoryDesc: '按照在日生活与经营中的实际场景，选择对应的专业诊断。',
  count: '项工具',
  toolsEyebrow: '专业诊断工具',
  toolsTitle: '9 个专业工具，从在留诊断开始',
  toolsDesc: '高度人才积分计算（含特别高度人才J-Skip诊断）、永住申请条件诊断与租房初期费用诊断现已可用，其余专业工具将陆续上线。',
  processEyebrow: '使用流程',
  processTitle: '三步获得清晰的初步判断',
  processDesc: '正式使用时，统一填写姓名和电话号码；出生日期等信息仅在诊断确实需要时填写。',
  steps: [
    ['01', '选择需要的诊断', '从专业工具中选择与您当前情况对应的项目。'],
    ['02', '填写基本信息和相关条件', '按照分步引导，仅提供本次判断所需要的信息。'],
    ['03', '查看结果与下一步建议', '获得计算明细、判断依据以及需要人工确认的事项。'],
  ],
  trustEyebrow: '专业与透明',
  trustTitle: '有依据的初步诊断，不作夸大承诺',
  trustItems: [
    ['依据现行制度', '根据日本现行制度与一般实务设计，并随制度变化更新规则。'],
    ['结果清晰可查', '结果将展示计算明细和判断依据，便于理解和后续确认。'],
    ['人工确认衔接', '不使用成功率或许可保证等表达，复杂情况建议由 SUNRISE 人工确认。'],
  ],
} : {
  heroEyebrow: '日本での暮らしと事業を支える専門ツール',
  title: 'SUNRISE 専門診断・シミュレーション',
  subtitle: '簡単な質問に回答することで、在留資格、永住、不動産、会社経営、給与、年金に関する条件や費用を確認できます。',
  tags: ['無料で利用', 'アカウント登録不要', '約3～10分', '結果は初期判断の参考'],
  start: '専門診断を始める',
  demo: '画面イメージ',
  demoStatus: '現在の診断状況',
  demoStatusValue: '条件確認が完了',
  demoResult: '想定される結果',
  demoResultValue: '追加確認の対象です',
  demoItems: ['基本条件を確認済み', '一部書類の補足が必要', '専門スタッフによる確認を推奨'],
  demoNext: '次のステップ',
  demoNextValue: '書類を整理し、SUNRISEへご相談ください',
  categoryEyebrow: '診断カテゴリー',
  categoryTitle: 'いま気になることから始められます',
  categoryDesc: '日本での暮らしや事業の場面に合わせて、必要な専門診断をお選びください。',
  count: 'ツール',
  toolsEyebrow: '専門診断ツール',
  toolsTitle: '9つの専門ツール、在留診断から公開',
  toolsDesc: '高度人材ポイント計算（特別高度人材J-Skip診断を含む）、永住許可要件診断、賃貸初期費用診断をご利用いただけます。その他のツールも順次公開します。',
  processEyebrow: 'ご利用の流れ',
  processTitle: '3つのステップで初期判断を分かりやすく',
  processDesc: '正式利用時には氏名と電話番号を入力し、生年月日などは診断上必要な場合にのみ入力します。',
  steps: [
    ['01', '必要な診断を選ぶ', '現在の状況に合う項目を専門ツールから選択します。'],
    ['02', '基本情報と条件を入力', 'ステップごとの案内に沿って、判断に必要な情報のみ入力します。'],
    ['03', '結果と次の対応を確認', '計算内訳、判断根拠、専門家の確認が必要な事項を確認します。'],
  ],
  trustEyebrow: '専門性と透明性',
  trustTitle: '根拠に基づく初期診断を、誠実に',
  trustItems: [
    ['現行制度に対応', '日本の現行制度と一般的な実務に基づいて設計し、制度改正に応じて更新します。'],
    ['判断根拠を明示', '計算内訳と判断根拠を表示し、その後の確認にも活用しやすくします。'],
    ['専門スタッフへ連携', '成功率や許可を保証する表現は行わず、複雑な場合はSUNRISEによる確認をご案内します。'],
  ],
})

function goToTools() {
  document.querySelector('#tools')?.scrollIntoView({ behavior: 'smooth' })
}

function selectTool(tool: DiagnosisTool) {
  if (tool.route) {
    void router.push(tool.route)
  } else {
    dialogOpen.value = true
  }
}
</script>

<template>
  <div>
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <span class="eyebrow">{{ copy.heroEyebrow }}</span>
          <h1>{{ copy.title }}</h1>
          <p class="hero-subtitle">{{ copy.subtitle }}</p>
          <div class="hero-tags">
            <span v-for="tag in copy.tags" :key="tag"><el-icon><Check /></el-icon>{{ tag }}</span>
          </div>
          <div class="hero-actions">
            <el-button type="primary" size="large" @click="goToTools">{{ copy.start }}<el-icon class="el-icon--right"><ArrowRight /></el-icon></el-button>
            <el-button size="large" @click="router.push('/tools')">{{ settings.dictionary.common.viewTools }}</el-button>
          </div>
        </div>
        <div class="result-preview" aria-label="diagnosis result preview">
          <div class="preview-header">
            <span class="preview-label">{{ copy.demo }}</span>
            <span class="preview-dots"><i></i><i></i><i></i></span>
          </div>
          <div class="preview-body">
            <div class="preview-status">
              <div><span>{{ copy.demoStatus }}</span><strong>{{ copy.demoStatusValue }}</strong></div>
              <span class="status-badge"><el-icon><CircleCheck /></el-icon></span>
            </div>
            <div class="preview-result">
              <span>{{ copy.demoResult }}</span>
              <strong>{{ copy.demoResultValue }}</strong>
            </div>
            <ul class="preview-list">
              <li v-for="(item, index) in copy.demoItems" :key="item">
                <el-icon :class="{ warning: index === 1, info: index === 2 }"><Check v-if="index === 0" /><Warning v-else-if="index === 1" /><InfoFilled v-else /></el-icon>
                {{ item }}
              </li>
            </ul>
            <div class="preview-next">
              <span>{{ copy.demoNext }}</span>
              <p>{{ copy.demoNextValue }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section categories-section">
      <div class="container">
        <SectionHeading :eyebrow="copy.categoryEyebrow" :title="copy.categoryTitle" :description="copy.categoryDesc" align="center" />
        <div class="category-grid">
          <article v-for="category in categories" :key="category.id" class="category-card" @click="router.push({ path: '/tools', query: { category: category.id } })">
            <span class="category-icon"><el-icon :size="24"><component :is="iconMap[category.icon as IconName]" /></el-icon></span>
            <h3>{{ settings.text(category.name) }}</h3>
            <p>{{ settings.text(category.description) }}</p>
            <div class="category-footer"><span>{{ category.count }} {{ copy.count }}</span><el-icon><ArrowRight /></el-icon></div>
          </article>
        </div>
      </div>
    </section>

    <section id="tools" class="section tools-section">
      <div class="container">
        <SectionHeading :eyebrow="copy.toolsEyebrow" :title="copy.toolsTitle" :description="copy.toolsDesc" />
        <div class="tool-grid">
          <ToolCard v-for="tool in tools" :key="tool.id" :tool="tool" @select="selectTool" />
        </div>
        <div class="section-action"><el-button size="large" @click="router.push('/tools')">{{ settings.dictionary.common.viewTools }}<el-icon class="el-icon--right"><ArrowRight /></el-icon></el-button></div>
      </div>
    </section>

    <section class="section process-section">
      <div class="container">
        <SectionHeading :eyebrow="copy.processEyebrow" :title="copy.processTitle" :description="copy.processDesc" align="center" />
        <div class="process-grid">
          <article v-for="step in copy.steps" :key="step[0]" class="process-card">
            <span>{{ step[0] }}</span><h3>{{ step[1] }}</h3><p>{{ step[2] }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section trust-section">
      <div class="container trust-layout">
        <SectionHeading :eyebrow="copy.trustEyebrow" :title="copy.trustTitle" />
        <div class="trust-list">
          <article v-for="(item, index) in copy.trustItems" :key="item[0]">
            <span class="trust-number">0{{ index + 1 }}</span>
            <div><h3>{{ item[0] }}</h3><p>{{ item[1] }}</p></div>
          </article>
        </div>
      </div>
    </section>
    <ComingSoonDialog v-model="dialogOpen" />
  </div>
</template>
