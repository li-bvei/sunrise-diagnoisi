<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import ToolCard from '@/components/ToolCard.vue'
import { tools } from '@/data/tools'
import type { DiagnosisTool } from '@/types/content'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const router = useRouter()
const query = ref('')
const filteredTools = computed(() => {
  const normalizedQuery = query.value.trim().toLocaleLowerCase()
  return tools.filter((tool) => {
    const searchable = `${settings.text(tool.name)} ${settings.text(tool.description)}`.toLocaleLowerCase()
    return !normalizedQuery || searchable.includes(normalizedQuery)
  })
})

const copy = computed(() => settings.locale === 'zh-CN' ? {
  title: '工具箱',
  count: (number: number) => `${number} 项工具`,
  search: '搜索工具',
  empty: '没有找到匹配的工具',
} : {
  title: 'ツールボックス',
  count: (number: number) => `${number} 件`,
  search: 'ツールを検索',
  empty: '該当するツールがありません',
})

function selectTool(tool: DiagnosisTool) {
  if (tool.route) void router.push(tool.route)
}
</script>

<template>
  <div class="toolbox-page">
    <div class="toolbox-shell">
      <section class="toolbox-content">
        <header class="toolbox-heading">
          <div>
            <h1>{{ copy.title }}</h1>
            <span>{{ copy.count(tools.length) }}</span>
          </div>
          <div class="toolbox-heading-actions">
            <div class="language-switch" aria-label="Language">
              <button :class="{ active: settings.locale === 'zh-CN' }" type="button" @click="settings.setLocale('zh-CN')">中文</button>
              <button :class="{ active: settings.locale === 'ja-JP' }" type="button" @click="settings.setLocale('ja-JP')">日本語</button>
            </div>
            <el-input v-model="query" class="toolbox-search" :placeholder="copy.search" clearable>
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
          </div>
        </header>

        <div v-if="filteredTools.length" class="toolbox-grid">
          <ToolCard v-for="tool in filteredTools" :key="tool.id" :tool="tool" @select="selectTool" />
        </div>
        <div v-else class="toolbox-empty">{{ copy.empty }}</div>
      </section>
    </div>
  </div>
</template>
