<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight } from '@element-plus/icons-vue'
import { categories, featuredTools, tools } from '@/data/tools'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()

const toolCount = computed(() => tools.length)

function categoryAria(name: string, count: number) {
  return settings.locale === 'zh-CN'
    ? `${name}，${count} 项工具，查看相关工具`
    : `${name}、${count} ツール、関連ツールを見る`
}

function toolAria(name: string) {
  return settings.locale === 'zh-CN' ? `打开${name}` : `${name}を開く`
}

function goToChoose() {
  document.getElementById('home-choose')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const copy = computed(() => settings.locale === 'zh-CN' ? {
  title: '在日生活与经营，先把条件和费用算清楚',
  subtitle: '在留资格、永住、租房初期费用、工资社保、公司经营——用几分钟得到有依据的初步判断和明细。',
  primary: '选择要确认的事项',
  secondary: '查看全部工具',
  categoryTitle: '按事项选择',
  count: '项工具',
  featuredTitle: '常用工具',
  featuredMore: `查看全部 ${toolCount.value} 个工具`,
  trustTitle: '关于诊断结果',
  trustItems: [
    ['依据现行制度', '根据日本现行制度与一般实务设计，并随制度变化更新规则。'],
    ['结果仅供初步参考', '结果展示计算明细与判断依据，不使用成功率或许可保证等表达。'],
    ['复杂情况人工确认', '涉及个别材料与判断时，建议由 SUNRISE 人工复核。'],
  ],
} : {
  title: '日本での暮らしと事業。まず条件と費用を整理する',
  subtitle: '在留資格、永住、賃貸初期費用、給与・社会保険、会社経営。数分で根拠のある初期判断と内訳が得られます。',
  primary: '確認したい項目を選ぶ',
  secondary: 'すべてのツールを見る',
  categoryTitle: '項目から選ぶ',
  count: 'ツール',
  featuredTitle: 'よく使うツール',
  featuredMore: `全 ${toolCount.value} ツールを見る`,
  trustTitle: '診断結果について',
  trustItems: [
    ['現行制度に対応', '日本の現行制度と一般的な実務に基づいて設計し、制度改正に応じて更新します。'],
    ['結果は初期判断の参考', '計算内訳と判断根拠を表示し、成功率や許可を保証する表現は行いません。'],
    ['複雑な場合は人へ', '個別の資料や判断が関わる場合は、SUNRISEによる確認をご案内します。'],
  ],
})
</script>

<template>
  <div class="home">
    <section class="home-hero">
      <div class="container">
        <h1>{{ copy.title }}</h1>
        <p class="home-hero-lead">{{ copy.subtitle }}</p>
        <div class="home-hero-actions">
          <el-button type="primary" size="large" @click="goToChoose">
            {{ copy.primary }}<el-icon class="el-icon--right"><ArrowRight /></el-icon>
          </el-button>
          <RouterLink class="home-hero-link" to="/tools">{{ copy.secondary }}</RouterLink>
        </div>
      </div>
    </section>

    <section id="home-choose" class="section home-section">
      <div class="container">
        <h2 class="home-section-title">{{ copy.categoryTitle }}</h2>
        <ul class="home-list">
          <li v-for="category in categories" :key="category.id">
            <RouterLink
              class="home-list-row"
              :to="{ path: '/tools', query: { category: category.id } }"
              :aria-label="categoryAria(settings.text(category.name), category.count)"
            >
              <span class="home-list-main">
                <strong>{{ settings.text(category.name) }}</strong>
                <span class="home-list-desc">{{ settings.text(category.description) }}</span>
              </span>
              <span class="home-list-meta">{{ category.count }} {{ copy.count }}</span>
              <el-icon class="home-list-arrow"><ArrowRight /></el-icon>
            </RouterLink>
          </li>
        </ul>
      </div>
    </section>

    <section class="section home-section">
      <div class="container">
        <h2 class="home-section-title">{{ copy.featuredTitle }}</h2>
        <ul class="home-list">
          <li v-for="tool in featuredTools" :key="tool.id">
            <RouterLink class="home-list-row" :to="tool.route ?? '/tools'" :aria-label="toolAria(settings.text(tool.name))">
              <span class="home-list-main">
                <strong>{{ settings.text(tool.name) }}</strong>
                <span class="home-list-desc">{{ settings.text(tool.description) }}</span>
              </span>
              <el-icon class="home-list-arrow"><ArrowRight /></el-icon>
            </RouterLink>
          </li>
        </ul>
        <RouterLink class="home-more-link" to="/tools">
          {{ copy.featuredMore }}<el-icon><ArrowRight /></el-icon>
        </RouterLink>
      </div>
    </section>

    <section class="section home-section home-trust">
      <div class="container">
        <h2 class="home-section-title">{{ copy.trustTitle }}</h2>
        <dl class="home-trust-list">
          <div v-for="item in copy.trustItems" :key="item[0]">
            <dt>{{ item[0] }}</dt>
            <dd>{{ item[1] }}</dd>
          </div>
        </dl>
      </div>
    </section>
  </div>
</template>
