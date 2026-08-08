<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { CircleCheck, CircleClose, Star } from '@element-plus/icons-vue'
import rawQuestions from '@/data/takken-questions.json'
import type { TakkenAttemptMap, TakkenPracticeMode, TakkenQuestion } from '@/types/takken'
import { loadTakkenAttempts, saveTakkenAttempts } from '@/utils/takkenStorage'

const questions = rawQuestions as TakkenQuestion[]
const questionMap = new Map(questions.map((question) => [question.id, question]))

const attempts = reactive<TakkenAttemptMap>(loadTakkenAttempts())

function isWeak(id: string): boolean {
  const record = attempts[id]
  return !!record && record.attempts > 0 && record.correct < record.attempts
}

const totalAttempts = computed(() => Object.values(attempts).reduce((sum, record) => sum + record.attempts, 0))
const totalCorrect = computed(() => Object.values(attempts).reduce((sum, record) => sum + record.correct, 0))
const accuracy = computed(() => (totalAttempts.value === 0 ? 0 : Math.round((totalCorrect.value / totalAttempts.value) * 100)))
const weakCount = computed(() => questions.filter((question) => isWeak(question.id)).length)

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

function buildOrder(targetMode: TakkenPracticeMode): string[] {
  if (targetMode === 'wrong') return questions.filter((question) => isWeak(question.id)).map((question) => question.id)
  if (targetMode === 'random') return shuffle(questions.map((question) => question.id))
  return questions.map((question) => question.id)
}

const mode = ref<TakkenPracticeMode>('all')
const orderIds = ref<string[]>(buildOrder('all'))
const currentIndex = ref(0)

function setMode(target: TakkenPracticeMode) {
  mode.value = target
  orderIds.value = buildOrder(target)
  currentIndex.value = 0
}

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

const sessionAnswers = reactive<Record<string, number>>({})
const selectedOption = computed<number | undefined>(() => {
  const question = currentQuestion.value
  return question ? sessionAnswers[question.id] : undefined
})
const hasAnswered = computed(() => selectedOption.value !== undefined)
const isCorrect = computed(() => {
  const question = currentQuestion.value
  if (!question || selectedOption.value === undefined) return false
  return selectedOption.value === question.correct
})

function selectOption(index: number) {
  const question = currentQuestion.value
  if (!question || hasAnswered.value) return
  sessionAnswers[question.id] = index
  const record = attempts[question.id] ?? { attempts: 0, correct: 0 }
  record.attempts += 1
  if (index === question.correct) record.correct += 1
  attempts[question.id] = record
  saveTakkenAttempts(attempts)
}

function optionState(index: number): string {
  const question = currentQuestion.value
  if (!question || !hasAnswered.value) return ''
  if (index === question.correct) return 'correct'
  if (index === selectedOption.value) return 'wrong'
  return 'dim'
}

function goPrev() {
  if (currentIndex.value > 0) currentIndex.value -= 1
}
function goNext() {
  if (currentIndex.value < orderedQuestions.value.length - 1) currentIndex.value += 1
}
</script>

<template>
  <div class="page-surface takken-page">
    <section class="page-hero compact">
      <div class="container">
        <span class="eyebrow">宅建考试刷题</span>
        <h1>宅地建物取引士 过去问练习</h1>
        <p>逐题练习历年真题，作答历史会自动保存在本设备上，方便持续巩固薄弱题目。</p>
      </div>
    </section>

    <section class="section">
      <div class="container takken-shell">
        <nav class="takken-subnav">
          <RouterLink to="/tools/takken" class="takken-subnav-link">刷题练习</RouterLink>
          <RouterLink to="/tools/takken-notes" class="takken-subnav-link">考点速查</RouterLink>
        </nav>

        <div class="takken-stats">
          <div class="takken-stat"><strong>{{ totalAttempts }}</strong><span>累计练习次数</span></div>
          <div class="takken-stat"><strong>{{ totalAttempts === 0 ? '--' : `${accuracy}%` }}</strong><span>正确率</span></div>
          <div class="takken-stat"><strong>{{ weakCount }}</strong><span>当前薄弱题</span></div>
        </div>

        <div class="filter-bar takken-mode-bar">
          <div class="filter-pills">
            <button type="button" :class="{ active: mode === 'all' }" @click="setMode('all')">全部题目</button>
            <button type="button" :class="{ active: mode === 'wrong' }" @click="setMode('wrong')">只练错题</button>
            <button type="button" :class="{ active: mode === 'random' }" @click="setMode('random')">随机顺序</button>
          </div>
          <span v-if="progressLabel">{{ progressLabel }}</span>
        </div>

        <div v-if="!currentQuestion" class="takken-empty">
          <el-icon :size="34"><CircleCheck /></el-icon>
          <h3>{{ mode === 'wrong' ? '太棒了，没有错题了' : '题库暂无题目' }}</h3>
          <p v-if="mode === 'wrong'">切换到"全部题目"继续练习，答错的题目会自动出现在这里。</p>
        </div>

        <template v-else>
          <div class="takken-card">
            <div class="takken-card-head">
              <span class="takken-tag">{{ currentQuestion.tag }}</span>
              <span class="takken-title">{{ currentQuestion.title }}</span>
            </div>
            <p class="takken-stem">{{ currentQuestion.stem }}</p>
            <div class="takken-options">
              <button
                v-for="(option, index) in currentQuestion.options"
                :key="index"
                type="button"
                class="takken-option"
                :class="optionState(index)"
                :disabled="hasAnswered"
                @click="selectOption(index)"
              >
                <span class="takken-option-mark">{{ String.fromCharCode(65 + index) }}</span>
                <span>{{ option }}</span>
              </button>
            </div>

            <div v-if="hasAnswered" class="takken-feedback" :class="isCorrect ? 'correct' : 'wrong'">
              <div class="takken-feedback-title" :class="isCorrect ? 'correct' : 'wrong'">
                <el-icon><CircleCheck v-if="isCorrect" /><CircleClose v-else /></el-icon>
                {{ isCorrect ? '答对了' : '答错了' }}
              </div>
              <p class="takken-explain">{{ currentQuestion.explain }}</p>
              <div class="takken-takeaway"><el-icon><Star /></el-icon><span>{{ currentQuestion.takeaway }}</span></div>
            </div>
          </div>
        </template>
      </div>
    </section>

    <div v-if="orderedQuestions.length > 0" class="takken-bottom-nav">
      <div class="container takken-bottom-nav-inner">
        <el-button size="large" :disabled="currentIndex === 0" @click="goPrev">上一题</el-button>
        <el-button type="primary" size="large" :disabled="currentIndex >= orderedQuestions.length - 1" @click="goNext">下一题</el-button>
      </div>
    </div>
  </div>
</template>
