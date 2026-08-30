<script setup lang="ts">
import { computed, nextTick, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { CircleCheck, CircleClose, List, Star, StarFilled } from '@element-plus/icons-vue'
import TakkenSubnav from '@/components/takken/TakkenSubnav.vue'
import TakkenTagFilter from '@/components/takken/TakkenTagFilter.vue'
import TakkenQuestionPicker from '@/components/takken/TakkenQuestionPicker.vue'
import { TAKKEN_QUESTIONS } from '@/utils/takkenQuestionModel'
import type { TakkenAttemptMap, TakkenPracticeMode, TakkenQuestion } from '@/types/takken'
import {
  applyTakkenAnswer,
  isDueToday,
  isMastered,
  isUnpracticed,
  loadTakkenAttempts,
  loadTakkenFavorites,
  needsReview,
  saveTakkenAttempts,
  saveTakkenFavorites,
} from '@/utils/takkenStorage'
import { classifyTakkenTag, type TakkenCategory } from '@/utils/takkenCategories'

const questions = TAKKEN_QUESTIONS
const questionMap = new Map(questions.map((question) => [question.id, question]))
const allTags = questions.map((question) => question.tag)

const attempts = reactive<TakkenAttemptMap>(loadTakkenAttempts())
const favorites = ref<Set<string>>(loadTakkenFavorites())

function toggleFavorite(id: string) {
  const next = new Set(favorites.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  favorites.value = next
  saveTakkenFavorites(next)
}

const totalAttempts = computed(() => Object.values(attempts).reduce((sum, record) => sum + record.attempts, 0))
const totalCorrect = computed(() => Object.values(attempts).reduce((sum, record) => sum + record.correct, 0))
const accuracy = computed(() => (totalAttempts.value === 0 ? 0 : Math.round((totalCorrect.value / totalAttempts.value) * 100)))
const needsReviewCount = computed(() => questions.filter((question) => needsReview(attempts[question.id])).length)
const masteredCount = computed(() => questions.filter((question) => isMastered(attempts[question.id])).length)

function shuffle<T>(list: T[]): T[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const a = copy[i]
    const b = copy[j]
    if (a === undefined || b === undefined) continue
    copy[i] = b
    copy[j] = a
  }
  return copy
}

const route = useRoute()
const initialTag = typeof route.query.tag === 'string' ? route.query.tag : null
const initialCategoryParam = typeof route.query.category === 'string' ? (route.query.category as TakkenCategory) : null
// A link can target a whole subject ("category") without pinning to one specific tag — used by the
// weakness-analysis page's "去练习" buttons, which point at "this subject's still-needs-review
// questions" rather than one narrow tag.
const selectedCategory = ref<TakkenCategory | null>(initialTag ? classifyTakkenTag(initialTag) : initialCategoryParam)
const selectedTag = ref<string | null>(initialTag)

const filteredQuestions = computed(() => {
  return questions.filter((question) => {
    if (selectedTag.value) return question.tag === selectedTag.value
    if (selectedCategory.value) return classifyTakkenTag(question.tag) === selectedCategory.value
    return true
  })
})

function buildOrder(targetMode: TakkenPracticeMode): string[] {
  const pool = filteredQuestions.value
  if (targetMode === 'wrong') return pool.filter((question) => needsReview(attempts[question.id])).map((question) => question.id)
  if (targetMode === 'random') return shuffle(pool.map((question) => question.id))
  if (targetMode === 'unpracticed') return pool.filter((question) => isUnpracticed(attempts[question.id])).map((question) => question.id)
  if (targetMode === 'favorites') return pool.filter((question) => favorites.value.has(question.id)).map((question) => question.id)
  if (targetMode === 'dueToday') return pool.filter((question) => isDueToday(attempts[question.id])).map((question) => question.id)
  return pool.map((question) => question.id)
}

const VALID_MODES: TakkenPracticeMode[] = ['all', 'wrong', 'random', 'unpracticed', 'favorites', 'dueToday']
const initialMode: TakkenPracticeMode = typeof route.query.mode === 'string' && (VALID_MODES as string[]).includes(route.query.mode)
  ? (route.query.mode as TakkenPracticeMode)
  : 'all'

const mode = ref<TakkenPracticeMode>(initialMode)
const orderIds = ref<string[]>(buildOrder(initialMode))
const currentIndex = ref(0)

/** Entering a new practice run (mode switch or filter change) should always present its questions
 * as freshly answerable — a question can be in the "只练错题" queue precisely because it was already
 * answered (wrongly) in a previous run, so leaving old session answers in place would show it as
 * disabled with stale feedback instead of ready to retry. The permanent attempts/mastery history in
 * `attempts` is untouched; only the current-visit answered/disabled state is cleared. */
function clearSessionAnswers() {
  for (const key of Object.keys(sessionAnswers)) delete sessionAnswers[key]
}

function setMode(target: TakkenPracticeMode) {
  mode.value = target
  orderIds.value = buildOrder(target)
  currentIndex.value = 0
  clearSessionAnswers()
}

watch([selectedCategory, selectedTag], () => {
  orderIds.value = buildOrder(mode.value)
  currentIndex.value = 0
  clearSessionAnswers()
})

const orderedQuestions = computed<TakkenQuestion[]>(() => {
  const list: TakkenQuestion[] = []
  for (const id of orderIds.value) {
    const question = questionMap.get(id)
    if (question) list.push(question)
  }
  return list
})
const currentQuestion = computed<TakkenQuestion | undefined>(() => orderedQuestions.value[currentIndex.value])
const progressLabel = computed(() => (orderedQuestions.value.length === 0 ? '' : `${currentIndex.value + 1} / ${orderedQuestions.value.length}`))

// Shuffled once per question id, and only recomputed when the question identity actually changes —
// navigating back to a question you already saw this session keeps the same option order.
const shuffledOptionIds = ref<string[]>([])
const shuffleCache = new Map<string, string[]>()
watch(
  () => currentQuestion.value?.id,
  () => {
    const question = currentQuestion.value
    if (!question) {
      shuffledOptionIds.value = []
      return
    }
    let order = shuffleCache.get(question.id)
    if (!order) {
      order = shuffle(question.options.map((option) => option.id))
      shuffleCache.set(question.id, order)
    }
    shuffledOptionIds.value = order
  },
  { immediate: true },
)

const displayOptions = computed(() => {
  const question = currentQuestion.value
  if (!question) return []
  const byId = new Map(question.options.map((option) => [option.id, option]))
  return shuffledOptionIds.value.map((id) => byId.get(id)).filter((option): option is NonNullable<typeof option> => !!option)
})

// Legacy questions don't have per-option explainZh yet — for those the shared `explain` prose is
// written in the question's *original* option order, which no longer matches the shuffled A/B/C/D
// letters. We keep a mapping (letter -> original option number) so it can be looked up, but it is
// internal bookkeeping, not something to print under every option — see `optionMapping` below,
// surfaced only inside a collapsed detail in the feedback panel.
const hasPerOptionExplain = computed(() => !!currentQuestion.value?.options.some((option) => option.explainZh))
function originalPosition(optionId: string): number {
  const question = currentQuestion.value
  if (!question) return 0
  return question.options.findIndex((option) => option.id === optionId) + 1
}
const optionMapping = computed(() => displayOptions.value.map((option, index) => ({
  letter: String.fromCharCode(65 + index),
  original: originalPosition(option.id),
})))

const sessionAnswers = reactive<Record<string, string>>({})
const selectedOptionId = computed<string | undefined>(() => {
  const question = currentQuestion.value
  return question ? sessionAnswers[question.id] : undefined
})
const hasAnswered = computed(() => selectedOptionId.value !== undefined)
const isCorrect = computed(() => {
  const question = currentQuestion.value
  if (!question || selectedOptionId.value === undefined) return false
  return selectedOptionId.value === question.correctOptionId
})
function letterForOptionId(optionId: string | undefined): string | null {
  if (!optionId) return null
  const index = displayOptions.value.findIndex((option) => option.id === optionId)
  return index >= 0 ? String.fromCharCode(65 + index) : null
}
const selectedLetter = computed(() => letterForOptionId(selectedOptionId.value))
const correctLetter = computed(() => letterForOptionId(currentQuestion.value?.correctOptionId))

/** Shown as a collapsed, secondary line above the stem when a question already has practice
 * history but hasn't been (re)answered in the current run yet — keeps the history visible without
 * blocking the options or forcing a scroll to a "再练一次" button buried in the old feedback. */
const previousAttemptSummary = computed(() => {
  const question = currentQuestion.value
  if (!question || hasAnswered.value) return null
  const record = attempts[question.id]
  if (!record || record.attempts === 0) return null
  return record
})

const comboStreak = ref(0)
const praiseText = computed(() => {
  if (comboStreak.value >= 8) return 'Perfect!'
  if (comboStreak.value >= 5) return 'Amazing!'
  if (comboStreak.value >= 3) return 'Great!'
  return 'Good!'
})

const toastVisible = ref(false)
const toastText = ref('')
const toastCombo = ref(0)
const toastKey = ref(0)
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(text: string, combo: number) {
  toastText.value = text
  toastCombo.value = combo
  toastKey.value += 1
  toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, 1200)
}

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer)
})

function selectOption(optionId: string) {
  const question = currentQuestion.value
  if (!question || hasAnswered.value) return
  sessionAnswers[question.id] = optionId
  const correct = optionId === question.correctOptionId
  attempts[question.id] = applyTakkenAnswer(attempts[question.id], correct)
  if (correct) {
    comboStreak.value += 1
    showToast(praiseText.value, comboStreak.value)
  } else {
    comboStreak.value = 0
  }
  saveTakkenAttempts(attempts)
}

/** "再练一次" — clears just this question's session answer so the options become clickable again;
 * the next click still goes through selectOption and creates a brand-new attempt record entry. */
function retryCurrentQuestion() {
  const question = currentQuestion.value
  if (!question) return
  delete sessionAnswers[question.id]
}

function optionState(optionId: string): string {
  const question = currentQuestion.value
  if (!question || !hasAnswered.value) return ''
  if (optionId === question.correctOptionId) return 'correct'
  if (optionId === selectedOptionId.value) return 'wrong'
  return 'dim'
}

const isLastQuestion = computed(() => currentIndex.value >= orderedQuestions.value.length - 1)
const nextButtonLabel = computed(() => {
  if (isLastQuestion.value) return '已是最后一题'
  return hasAnswered.value ? '下一题' : '跳过'
})

// Every question-switching action (prev/next/picker/hero CTA) must land the user on the new
// question's title, not wherever the page happened to be scrolled to — otherwise "下一题" from the
// bottom bar drops straight into the footer on mobile. Scroll first, then move focus without
// re-triggering a second scroll, and let the aria-live progress label announce the change.
const cardRef = ref<HTMLElement | null>(null)
function focusCard() {
  nextTick(() => {
    cardRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    cardRef.value?.focus({ preventScroll: true })
  })
}

function goPrev() {
  if (currentIndex.value > 0) {
    currentIndex.value -= 1
    focusCard()
  }
}
function goNext() {
  if (currentIndex.value < orderedQuestions.value.length - 1) {
    currentIndex.value += 1
    focusCard()
  }
}

const pickerVisible = ref(false)
function selectFromPicker(questionId: string) {
  const inFiltered = filteredQuestions.value.some((question) => question.id === questionId)
  const pool = inFiltered ? filteredQuestions.value : questions
  orderIds.value = pool.map((question) => question.id)
  const index = orderIds.value.indexOf(questionId)
  currentIndex.value = index >= 0 ? index : 0
  focusCard()
}

const dueTodayCount = computed(() => questions.filter((question) => isDueToday(attempts[question.id])).length)
const heroCtaLabel = computed(() => {
  if (dueTodayCount.value > 0) return `先复习今日到期题（${dueTodayCount.value}）`
  if (totalAttempts.value === 0) return '开始刷题'
  return '继续刷题'
})
function heroCtaAction() {
  if (dueTodayCount.value > 0 && mode.value !== 'dueToday') setMode('dueToday')
  focusCard()
}
</script>

<template>
  <div class="page-surface takken-page">
    <section class="page-hero compact takken-hero">
      <div class="container takken-hero-inner">
        <div class="takken-hero-text">
          <span class="eyebrow">宅建考试刷题</span>
          <h1>宅地建物取引士 过去问练习</h1>
        </div>
        <div class="takken-hero-actions">
          <el-button type="primary" size="large" @click="heroCtaAction">{{ heroCtaLabel }}</el-button>
          <span v-if="totalAttempts > 0" class="takken-hero-status">仍需复习 {{ needsReviewCount }} · 已掌握 {{ masteredCount }}</span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container takken-shell">
        <TakkenSubnav />

        <div class="takken-stats">
          <div class="takken-stat"><strong>{{ totalAttempts }}</strong><span>累计练习次数</span></div>
          <div class="takken-stat"><strong>{{ totalAttempts === 0 ? '--' : `${accuracy}%` }}</strong><span>正确率</span></div>
          <div class="takken-stat"><strong>{{ needsReviewCount }}</strong><span>仍需复习</span></div>
          <div class="takken-stat"><strong>{{ masteredCount }}</strong><span>已掌握</span></div>
        </div>

        <TakkenTagFilter
          :tags="allTags"
          :category="selectedCategory"
          :tag="selectedTag"
          @update:category="selectedCategory = $event"
          @update:tag="selectedTag = $event"
        />

        <div class="filter-bar takken-mode-bar">
          <div class="filter-pills takken-pills-wrap">
            <button type="button" :class="{ active: mode === 'all' }" @click="setMode('all')">全部题目</button>
            <button type="button" :class="{ active: mode === 'wrong' }" @click="setMode('wrong')">只练错题</button>
            <button type="button" :class="{ active: mode === 'dueToday' }" @click="setMode('dueToday')">今日到期复习</button>
            <button type="button" :class="{ active: mode === 'unpracticed' }" @click="setMode('unpracticed')">未练习题</button>
            <button type="button" :class="{ active: mode === 'favorites' }" @click="setMode('favorites')">已收藏题</button>
            <button type="button" :class="{ active: mode === 'random' }" @click="setMode('random')">随机顺序</button>
          </div>
          <button type="button" class="takken-picker-trigger" @click="pickerVisible = true"><el-icon><List /></el-icon>选题</button>
        </div>
        <p v-if="progressLabel" class="takken-progress-label" role="status" aria-live="polite">{{ progressLabel }}</p>

        <div v-if="!currentQuestion" class="takken-empty">
          <el-icon :size="34"><CircleCheck /></el-icon>
          <h3>{{ filteredQuestions.length === 0 ? '这个分类下还没有题目' : '这个范围内暂时没有题目' }}</h3>
          <p v-if="filteredQuestions.length > 0">切换到其他筛选条件，或直接选一个新的练习范围：</p>
          <p v-else>试试切换到其他分类，或选择"全部类型"。</p>
          <div v-if="filteredQuestions.length > 0" class="takken-empty-actions">
            <el-button size="default" @click="setMode('unpracticed')">去做未练习题</el-button>
            <el-button size="default" @click="pickerVisible = true">去选题</el-button>
            <el-button size="default" @click="setMode('all')">查看全部题目</el-button>
          </div>
        </div>

        <template v-else>
          <div ref="cardRef" class="takken-card" tabindex="-1">
            <div class="takken-card-head">
              <span class="takken-tag">{{ currentQuestion.tag }}</span>
              <span class="takken-title">{{ currentQuestion.title }}</span>
              <button type="button" class="takken-favorite-toggle" :aria-label="favorites.has(currentQuestion.id) ? '取消收藏' : '收藏本题'" @click="toggleFavorite(currentQuestion.id)">
                <el-icon :size="18"><StarFilled v-if="favorites.has(currentQuestion.id)" /><Star v-else /></el-icon>
              </button>
            </div>
            <details v-if="previousAttemptSummary" class="takken-prev-result">
              <summary>上次作答：{{ previousAttemptSummary.lastResult === 'correct' ? '答对' : '答错' }} · 已练习 {{ previousAttemptSummary.attempts }} 次</summary>
              <p>本题当前状态为"仍需复习"，可以直接重新作答，不会影响之前的记录。</p>
            </details>
            <p class="takken-stem">{{ currentQuestion.stem }}</p>
            <div class="takken-options">
              <button
                v-for="(option, displayIndex) in displayOptions"
                :key="option.id"
                type="button"
                class="takken-option"
                :class="optionState(option.id)"
                :disabled="hasAnswered"
                @click="selectOption(option.id)"
              >
                <span class="takken-option-mark">{{ String.fromCharCode(65 + displayIndex) }}</span>
                <span class="takken-option-body">
                  {{ option.text }}
                  <em v-if="hasAnswered && option.explainZh" class="takken-option-explain">{{ option.explainZh }}</em>
                </span>
                <span v-if="hasAnswered && option.id === currentQuestion.correctOptionId" class="takken-option-flag correct">正确答案</span>
                <span v-else-if="hasAnswered && option.id === selectedOptionId" class="takken-option-flag wrong">你的选择</span>
              </button>
            </div>

            <div v-if="hasAnswered" class="takken-feedback" :class="isCorrect ? 'correct' : 'wrong'" aria-live="polite">
              <div class="takken-feedback-title" :class="isCorrect ? 'correct' : 'wrong'">
                <el-icon><CircleCheck v-if="isCorrect" /><CircleClose v-else /></el-icon>
                {{ isCorrect ? '答对了' : '答错了' }}
              </div>
              <div class="takken-feedback-summary">
                <span>你的答案：<strong>{{ selectedLetter }}</strong></span>
                <span v-if="!isCorrect">正确答案：<strong>{{ correctLetter }}</strong></span>
              </div>
              <p class="takken-explain">{{ currentQuestion.explain }}</p>
              <div class="takken-takeaway"><el-icon><Star /></el-icon><span>{{ currentQuestion.takeaway }}</span></div>
              <details v-if="!hasPerOptionExplain" class="takken-mapping-note">
                <summary>解析对照表（原题选项顺序）</summary>
                <ul>
                  <li v-for="entry in optionMapping" :key="entry.letter">{{ entry.letter }} = 解析原文中的"选项{{ entry.original }}"</li>
                </ul>
              </details>
              <button type="button" class="text-link takken-retry" @click="retryCurrentQuestion">再练一次</button>
            </div>
          </div>
        </template>
      </div>
    </section>

    <div v-if="orderedQuestions.length > 0" class="takken-bottom-nav">
      <div class="container takken-bottom-nav-inner">
        <el-button size="large" :disabled="currentIndex === 0" @click="goPrev">上一题</el-button>
        <el-button :type="hasAnswered ? 'primary' : 'default'" size="large" :disabled="isLastQuestion" @click="goNext">{{ nextButtonLabel }}</el-button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="toastVisible" :key="toastKey" class="takken-toast">
        <strong>{{ toastText }}</strong>
        <span v-if="toastCombo >= 2" class="takken-toast-combo">🔥 连对 {{ toastCombo }} 题</span>
      </div>
    </Teleport>

    <TakkenQuestionPicker v-model="pickerVisible" :questions="filteredQuestions" :attempts="attempts" :favorites="favorites" @select="selectFromPicker" />
  </div>
</template>
