<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'

defineProps<{ modelValue: boolean; specialized?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const settings = useSettingsStore()
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="settings.dictionary.dialog.title"
    width="min(92vw, 480px)"
    align-center
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p class="dialog-copy">{{ specialized ? settings.dictionary.dialog.skilledBody : settings.dictionary.dialog.body }}</p>
    <template #footer>
      <el-button type="primary" @click="emit('update:modelValue', false)">{{ settings.dictionary.dialog.confirm }}</el-button>
    </template>
  </el-dialog>
</template>
