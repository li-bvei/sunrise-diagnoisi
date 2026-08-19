<script setup lang="ts">
import { computed } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'
import { FINANCIAL_DISCLAIMER, FINANCIAL_PARAMETER_META } from '@/data/financialParameters'
import { practicalToolMessages } from '@/data/practicalToolMessages'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const copy = computed(() => practicalToolMessages[settings.locale].common)
</script>

<template>
  <aside class="practical-disclaimer">
    <el-icon><InfoFilled /></el-icon>
    <div>
      <p>{{ FINANCIAL_DISCLAIMER[settings.locale] }}</p>
      <details>
        <summary>{{ copy.source }} · {{ copy.year }} {{ FINANCIAL_PARAMETER_META.applicableYear }} · {{ copy.update }} {{ FINANCIAL_PARAMETER_META.updatedAt }}</summary>
        <ul>
          <li v-for="source in FINANCIAL_PARAMETER_META.sources" :key="source.url"><a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a></li>
        </ul>
      </details>
    </div>
  </aside>
</template>
