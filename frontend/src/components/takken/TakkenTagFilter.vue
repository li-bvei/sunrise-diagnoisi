<script setup lang="ts">
import { computed } from 'vue'
import { classifyTakkenTag, takkenTagLabel, TAKKEN_CATEGORY_ORDER, type TakkenCategory } from '@/utils/takkenCategories'

const props = defineProps<{
  tags: string[]
  category: TakkenCategory | null
  tag: string | null
}>()
const emit = defineEmits<{
  'update:category': [value: TakkenCategory | null]
  'update:tag': [value: string | null]
}>()

const categoryCounts = computed(() => {
  const counts = new Map<TakkenCategory, number>()
  for (const tag of props.tags) {
    const category = classifyTakkenTag(tag)
    counts.set(category, (counts.get(category) ?? 0) + 1)
  }
  return counts
})
const availableCategories = computed(() => TAKKEN_CATEGORY_ORDER.filter((category) => categoryCounts.value.has(category)))

const tagCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const tag of props.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  return counts
})
const tagsInCategory = computed(() => {
  if (!props.category) return []
  return [...tagCounts.value.keys()]
    .filter((tag) => classifyTakkenTag(tag) === props.category)
    .sort((a, b) => a.localeCompare(b, 'zh'))
})

function selectCategory(category: TakkenCategory | null) {
  emit('update:category', category)
  emit('update:tag', null)
}
function selectTag(tag: string | null) {
  emit('update:tag', tag)
}
</script>

<template>
  <div class="takken-tag-filter">
    <div class="filter-pills takken-pills-wrap">
      <button type="button" :class="{ active: category === null }" @click="selectCategory(null)">全部类型</button>
      <button v-for="item in availableCategories" :key="item" type="button" :class="{ active: category === item }" @click="selectCategory(item)">
        {{ item }}（{{ categoryCounts.get(item) }}）
      </button>
    </div>
    <div v-if="category" class="filter-pills takken-tag-filter-sub takken-pills-wrap">
      <button type="button" :class="{ active: tag === null }" @click="selectTag(null)">全部（{{ categoryCounts.get(category) }}）</button>
      <button v-for="item in tagsInCategory" :key="item" type="button" :class="{ active: tag === item }" @click="selectTag(item)">
        {{ takkenTagLabel(item) }}（{{ tagCounts.get(item) }}）
      </button>
    </div>
  </div>
</template>
