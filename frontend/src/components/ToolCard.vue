<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight } from '@element-plus/icons-vue'
import type { DiagnosisTool } from '@/types/content'
import { useSettingsStore } from '@/stores/settings'
import { categoryName } from '@/data/tools'
import { iconMap, type IconName } from '@/utils/icons'

const props = defineProps<{ tool: DiagnosisTool }>()
const emit = defineEmits<{ select: [tool: DiagnosisTool] }>()
const settings = useSettingsStore()
const icon = computed(() => iconMap[props.tool.icon as IconName])
</script>

<template>
  <article class="tool-card">
    <div class="tool-card-topline">
      <span class="tool-icon"><el-icon :size="20"><component :is="icon" /></el-icon></span>
    </div>
    <span class="tool-category">{{ settings.text(categoryName(tool.category)) }}</span>
    <h3>{{ settings.text(tool.name) }}</h3>
    <p class="tool-description">{{ settings.text(tool.description) }}</p>
    <button class="text-link" type="button" @click="emit('select', tool)">
      {{ settings.dictionary.common.useNow }}
      <el-icon><ArrowRight /></el-icon>
    </button>
  </article>
</template>
