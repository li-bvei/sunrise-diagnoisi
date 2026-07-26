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
      <span class="tool-icon"><el-icon :size="22"><component :is="icon" /></el-icon></span>
      <el-tag :type="tool.status === 'available' ? 'success' : 'info'" effect="light" round>
        {{ tool.status === 'available' ? settings.dictionary.common.available : settings.dictionary.common.upcoming }}
      </el-tag>
    </div>
    <span class="tool-category">{{ settings.text(categoryName(tool.category)) }}</span>
    <h3>{{ settings.text(tool.name) }}</h3>
    <p class="tool-description">{{ settings.text(tool.description) }}</p>
    <dl class="tool-meta">
      <div>
        <dt>{{ settings.dictionary.common.minutes }}</dt>
        <dd>{{ settings.text(tool.duration) }}</dd>
      </div>
      <div>
        <dt>{{ settings.dictionary.common.result }}</dt>
        <dd>{{ settings.text(tool.results) }}</dd>
      </div>
    </dl>
    <button class="text-link" type="button" @click="emit('select', tool)">
      {{ tool.status === 'available' ? settings.dictionary.common.useNow : settings.dictionary.common.viewDetails }}
      <el-icon><ArrowRight /></el-icon>
    </button>
  </article>
</template>
