<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { InfoFilled } from '@element-plus/icons-vue'
import ToolCard from '@/components/ToolCard.vue'
import { categories, tools } from '@/data/tools'
import type { DiagnosisTool, ToolCategory } from '@/types/content'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const route = useRoute()
const router = useRouter()
const validCategory = categories.some((item) => item.id === route.query.category)
const activeCategory = ref<'all' | ToolCategory>(validCategory ? route.query.category as ToolCategory : 'all')
const filteredTools = computed(() => activeCategory.value === 'all' ? tools : tools.filter((tool) => tool.category === activeCategory.value))
const copy = computed(() => settings.locale === 'zh-CN' ? {
  eyebrow: '全部工具',
  title: '专业诊断工具中心',
  description: '从在留资格、不动产、收入社保、年金到在日记录，选择适合您当前情况的实用工具。',
  all: '全部',
  notice: '以下项目均已开放，可直接进入使用。计算结果为简易参考值。',
  showing: `显示 ${filteredTools.value.length} 项工具`,
} : {
  eyebrow: '全ツール',
  title: '専門診断ツールセンター',
  description: '在留資格、不動産、収入・社会保険、年金、在日記録から必要なツールをお選びください。',
  all: 'すべて',
  notice: '以下のツールはすべて公開済みです。計算結果は簡易的な参考値です。',
  showing: `${filteredTools.value.length}件のツールを表示`,
})

watch(activeCategory, (value) => {
  void router.replace({ query: value === 'all' ? {} : { category: value } })
})

function selectTool(tool: DiagnosisTool) {
  if (tool.route) void router.push(tool.route)
}
</script>

<template>
  <div class="page-surface">
    <section class="page-hero compact">
      <div class="container">
        <span class="eyebrow">{{ copy.eyebrow }}</span>
        <h1>{{ copy.title }}</h1>
        <p>{{ copy.description }}</p>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <div class="notice-bar"><el-icon><InfoFilled /></el-icon><span>{{ copy.notice }}</span></div>
        <div class="filter-bar">
          <div class="filter-pills">
            <button :class="{ active: activeCategory === 'all' }" type="button" @click="activeCategory = 'all'">{{ copy.all }}</button>
            <button v-for="category in categories" :key="category.id" :class="{ active: activeCategory === category.id }" type="button" @click="activeCategory = category.id">{{ settings.text(category.name) }}</button>
          </div>
          <span>{{ copy.showing }}</span>
        </div>
        <div class="tool-grid"><ToolCard v-for="tool in filteredTools" :key="tool.id" :tool="tool" @select="selectTool" /></div>
      </div>
    </section>
  </div>
</template>
