<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import type { TakkenAttemptMap, TakkenQuestion } from '@/types/takken'
import { filterTakkenQuestions, parseQuestionMeta, takkenQuestionStatus, type TakkenQuestionStatusFilter } from '@/utils/takkenQuestionModel'
import { classifyTakkenTag, takkenTagLabel, TAKKEN_CATEGORY_ORDER, type TakkenCategory } from '@/utils/takkenCategories'

const props = defineProps<{
  modelValue: boolean
  questions: TakkenQuestion[]
  attempts: TakkenAttemptMap
  favorites: Set<string>
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [questionId: string]
}>()

const keyword = ref('')
const statusFilter = ref<TakkenQuestionStatusFilter>('all')
const categoryFilter = ref<TakkenCategory | 'all'>('all')
const eraFilter = ref<string | 'all'>('all')

const eraOptions = computed(() => {
  const set = new Set<string>()
  for (const question of props.questions) set.add(parseQuestionMeta(question.title).era)
  return [...set]
})

const categoryOptions = computed(() => {
  const set = new Set<TakkenCategory>()
  for (const question of props.questions) set.add(classifyTakkenTag(question.tag))
  return TAKKEN_CATEGORY_ORDER.filter((category) => set.has(category))
})

function statusOf(id: string) {
  return takkenQuestionStatus(id, props.attempts)
}

const filteredQuestions = computed(() =>
  filterTakkenQuestions(props.questions, props.attempts, props.favorites, {
    keyword: keyword.value,
    category: categoryFilter.value,
    era: eraFilter.value,
    status: statusFilter.value,
  }),
)

function resultIcon(id: string): string {
  const record = props.attempts[id]
  if (!record?.lastResult) return '—'
  return record.lastResult === 'correct' ? '✓' : '✗'
}

function close() {
  emit('update:modelValue', false)
}
function pick(id: string) {
  emit('select', id)
  close()
}
</script>

<template>
  <el-drawer class="takken-picker-drawer" :model-value="modelValue" title="选择题目" size="min(480px, 100%)" @update:model-value="emit('update:modelValue', $event)">
    <div class="takken-picker">
      <el-input v-model="keyword" placeholder="搜索题干、标签或题号" clearable :prefix-icon="Search" />

      <div class="takken-picker-row">
        <el-select v-model="categoryFilter" placeholder="大科目">
          <el-option label="全部科目" value="all" />
          <el-option v-for="category in categoryOptions" :key="category" :label="category" :value="category" />
        </el-select>
        <el-select v-model="eraFilter" placeholder="年份">
          <el-option label="全部年份" value="all" />
          <el-option v-for="era in eraOptions" :key="era" :label="era" :value="era" />
        </el-select>
      </div>

      <div class="filter-pills takken-pills-wrap takken-picker-status">
        <button type="button" :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'">全部</button>
        <button type="button" :class="{ active: statusFilter === 'new' }" @click="statusFilter = 'new'">新题</button>
        <button type="button" :class="{ active: statusFilter === 'unpracticed' }" @click="statusFilter = 'unpracticed'">未练习</button>
        <button type="button" :class="{ active: statusFilter === 'needsReview' }" @click="statusFilter = 'needsReview'">仍需复习</button>
        <button type="button" :class="{ active: statusFilter === 'mastered' }" @click="statusFilter = 'mastered'">已掌握</button>
        <button type="button" :class="{ active: statusFilter === 'favorite' }" @click="statusFilter = 'favorite'">已收藏</button>
        <button type="button" :class="{ active: statusFilter === 'dueToday' }" @click="statusFilter = 'dueToday'">今日到期</button>
      </div>

      <p class="takken-picker-count">共 {{ filteredQuestions.length }} 题</p>

      <div class="takken-picker-list">
        <button v-for="question in filteredQuestions" :key="question.id" type="button" class="takken-picker-item" @click="pick(question.id)">
          <div class="takken-picker-item-head">
            <span class="takken-picker-title">{{ question.title }}</span>
            <span class="takken-picker-result" :class="attempts[question.id]?.lastResult">{{ resultIcon(question.id) }}</span>
          </div>
          <div class="takken-picker-item-meta">
            <span>{{ classifyTakkenTag(question.tag) }}</span>
            <span>{{ takkenTagLabel(question.tag) }}</span>
          </div>
          <div class="takken-picker-item-foot">
            <span class="takken-picker-badge" :class="statusOf(question.id)">
              {{ statusOf(question.id) === 'mastered' ? '已掌握' : statusOf(question.id) === 'needsReview' ? '仍需复习' : '未练习' }}
            </span>
            <span v-if="question.isNew && !attempts[question.id]" class="takken-picker-badge new">新题</span>
            <span v-if="question.timesReported >= 2" class="takken-picker-badge priority">🔥 重点 ×{{ question.timesReported }}</span>
            <span v-if="favorites.has(question.id)" class="takken-picker-badge favorite">已收藏</span>
            <span class="takken-picker-attempts">已答 {{ attempts[question.id]?.attempts ?? 0 }} 次</span>
          </div>
        </button>
        <p v-if="filteredQuestions.length === 0" class="takken-picker-empty">没有符合条件的题目，换个筛选条件试试。</p>
      </div>
    </div>
  </el-drawer>
</template>
