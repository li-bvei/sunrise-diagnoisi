<script setup lang="ts">
import { ref } from 'vue'
import { QuestionFilled } from '@element-plus/icons-vue'

defineProps<{
  label: string
  title: string
  content: string
  sourceUrl?: string
  sourceLabel?: string
}>()
const visible = ref(false)
</script>

<template>
  <el-popover v-model:visible="visible" trigger="manual" :width="360" placement="top" popper-class="help-popover">
    <template #reference>
      <button
        type="button"
        class="help-trigger"
        :aria-label="label"
        :aria-expanded="visible"
        @mouseenter="visible = true"
        @mouseleave="visible = false"
        @focus="visible = true"
        @blur="visible = false"
        @click="visible = !visible"
      >
        <el-icon><QuestionFilled /></el-icon>
      </button>
    </template>
    <div class="help-popover-content" @mouseenter="visible = true" @mouseleave="visible = false">
      <strong>{{ title }}</strong>
      <p>{{ content }}</p>
      <a v-if="sourceUrl" :href="sourceUrl" target="_blank" rel="noopener noreferrer">
        {{ sourceLabel }} ↗
      </a>
    </div>
  </el-popover>
</template>
