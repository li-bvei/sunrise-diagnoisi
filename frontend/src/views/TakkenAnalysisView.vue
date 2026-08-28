<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Delete, UploadFilled } from '@element-plus/icons-vue'
import TakkenSubnav from '@/components/takken/TakkenSubnav.vue'
import { TAKKEN_QUESTIONS } from '@/utils/takkenQuestionModel'
import type { TakkenAttemptMap, TakkenUploadPayload } from '@/types/takken'
import { clearTakkenUpload, isMastered, loadTakkenAttempts, loadTakkenExamDate, loadTakkenUpload, needsReview, saveTakkenExamDate, saveTakkenUpload } from '@/utils/takkenStorage'
import { classifyCsvCategory, classifyTakkenTag, takkenTagLabel, TAKKEN_CATEGORY_ORDER, TAKKEN_CATEGORY_WEIGHTS, TAKKEN_EXAM_TOTAL_QUESTIONS, type TakkenCategory } from '@/utils/takkenCategories'
import { TakkenCsvParseError, parseTakkenCsvFile } from '@/utils/takkenCsvImport'
import { TAKKEN_SYLLABUS } from '@/data/takkenSyllabus'

const questions = TAKKEN_QUESTIONS
const attempts: TakkenAttemptMap = loadTakkenAttempts()
const router = useRouter()

const uploadPayload = ref<TakkenUploadPayload | null>(loadTakkenUpload())
const uploadError = ref<string | null>(null)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function pickFile() {
  fileInput.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  uploadError.value = null
  try {
    const records = await parseTakkenCsvFile(file)
    const payload: TakkenUploadPayload = { fileName: file.name, uploadedAt: new Date().toISOString(), records }
    saveTakkenUpload(payload)
    uploadPayload.value = payload
  } catch (error) {
    uploadError.value = error instanceof TakkenCsvParseError ? error.message : '文件解析失败，请确认这是导出的刷题记录 CSV。'
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function removeUpload() {
  clearTakkenUpload()
  uploadPayload.value = null
}

interface CsvStat { total: number; correct: number }

function csvAccuracy(stat: CsvStat): number {
  return stat.total === 0 ? 0 : Math.round((stat.correct / stat.total) * 100)
}

const csvOverall = computed<CsvStat | null>(() => {
  if (!uploadPayload.value) return null
  const records = uploadPayload.value.records
  return { total: records.length, correct: records.filter((record) => record.correct).length }
})

interface CsvCategoryStat extends CsvStat { category: TakkenCategory }

const csvCategoryStats = computed<CsvCategoryStat[]>(() => {
  if (!uploadPayload.value) return []
  const map = new Map<TakkenCategory, CsvCategoryStat>()
  for (const record of uploadPayload.value.records) {
    const category = classifyCsvCategory(record.categoryRaw)
    let entry = map.get(category)
    if (!entry) {
      entry = { category, total: 0, correct: 0 }
      map.set(category, entry)
    }
    entry.total += 1
    if (record.correct) entry.correct += 1
  }
  return [...map.values()].sort((a, b) => csvAccuracy(a) - csvAccuracy(b))
})

interface CsvSubStat extends CsvStat { category: TakkenCategory; subItem: string }

const csvSubStats = computed<CsvSubStat[]>(() => {
  if (!uploadPayload.value) return []
  const map = new Map<string, CsvSubStat>()
  for (const record of uploadPayload.value.records) {
    const category = classifyCsvCategory(record.categoryRaw)
    const key = `${category}__${record.subItemRaw}`
    let entry = map.get(key)
    if (!entry) {
      entry = { category, subItem: record.subItemRaw, total: 0, correct: 0 }
      map.set(key, entry)
    }
    entry.total += 1
    if (record.correct) entry.correct += 1
  }
  return [...map.values()].sort((a, b) => csvAccuracy(a) - csvAccuracy(b))
})

const examDate = ref<string | null>(loadTakkenExamDate())
const examDateModel = computed({
  get: () => examDate.value,
  set: (value: string | null) => {
    examDate.value = value
    saveTakkenExamDate(value)
  },
})
const daysLeft = computed(() => {
  if (!examDate.value) return null
  const target = new Date(`${examDate.value}T00:00:00+09:00`)
  return Math.ceil((target.getTime() - Date.now()) / 86_400_000)
})

// 这几个概念必须分开：原始错题数量（题库里有几题）、已复习数量（在本站至少答过一次）、
// 仍需复习数量（还没连续答对2次）、已掌握数量（连续答对2次以上）。不再用"错题密度"
// "复习正确率"这种把数量和正确率混在一起、容易被误读成"整个科目掌握了多少"的指标。
interface TagStat { tag: string; category: TakkenCategory; total: number; reviewed: number; needsReview: number; mastered: number }

const tagStats = computed<TagStat[]>(() => {
  const map = new Map<string, TagStat>()
  for (const question of questions) {
    let stat = map.get(question.tag)
    if (!stat) {
      stat = { tag: question.tag, category: classifyTakkenTag(question.tag), total: 0, reviewed: 0, needsReview: 0, mastered: 0 }
      map.set(question.tag, stat)
    }
    stat.total += 1
    const record = attempts[question.id]
    if (record && record.attempts > 0) stat.reviewed += 1
    if (needsReview(record)) stat.needsReview += 1
    if (isMastered(record)) stat.mastered += 1
  }
  return [...map.values()]
})

interface CategoryStat { category: TakkenCategory; total: number; reviewed: number; needsReview: number; mastered: number; weight: number | null }

const categoryStats = computed<CategoryStat[]>(() => {
  const map = new Map<string, CategoryStat>()
  for (const stat of tagStats.value) {
    let entry = map.get(stat.category)
    if (!entry) {
      const weight = stat.category === '其他' ? null : TAKKEN_CATEGORY_WEIGHTS[stat.category]
      entry = { category: stat.category, total: 0, reviewed: 0, needsReview: 0, mastered: 0, weight }
      map.set(stat.category, entry)
    }
    entry.total += stat.total
    entry.reviewed += stat.reviewed
    entry.needsReview += stat.needsReview
    entry.mastered += stat.mastered
  }
  const order = [...TAKKEN_CATEGORY_ORDER, '其他']
  return order.map((category) => map.get(category)).filter((entry): entry is CategoryStat => !!entry)
})

// 主排序按原始错题数量（哪个大科目错得最多排最前）；已掌握/仍需复习作为同等数量下的参考信息。
const sortedCategoryStats = computed(() => [...categoryStats.value].sort((a, b) => b.total - a.total))

// 细分知识点按"仍需复习数量"从高到低排——这是下一步最该优先复习的地方。
const rankedTagStats = computed(() => [...tagStats.value].sort((a, b) => {
  if (b.needsReview !== a.needsReview) return b.needsReview - a.needsReview
  return b.total - a.total
}))

const totalMistakes = computed(() => questions.length)
const reviewedCount = computed(() => questions.filter((question) => attempts[question.id]?.attempts).length)
const needsReviewTotal = computed(() => questions.filter((question) => needsReview(attempts[question.id])).length)
const masteredTotal = computed(() => questions.filter((question) => isMastered(attempts[question.id])).length)

function practiceTag(tag: string) {
  void router.push({ path: '/tools/takken', query: { tag } })
}

interface SyllabusMatch { label: string; matched: boolean; matchedTags: string[]; errorCount: number }

function syllabusCoverage(category: Exclude<TakkenCategory, '其他'>): SyllabusMatch[] {
  const items = TAKKEN_SYLLABUS[category]
  const actualStats = tagStats.value.filter((stat) => stat.category === category)
  return items.map((item) => {
    const matched = actualStats.filter((stat) => item.keywords.some((keyword) => stat.tag.includes(keyword) || keyword.includes(stat.tag)))
    return {
      label: item.label,
      matched: matched.length > 0,
      matchedTags: [...new Set(matched.map((stat) => takkenTagLabel(stat.tag)))],
      errorCount: matched.reduce((sum, stat) => sum + stat.total, 0),
    }
  }).sort((a, b) => b.errorCount - a.errorCount)
}

const coverageByCategory = computed(() => sortedCategoryStats.value
  .filter((stat): stat is CategoryStat & { category: Exclude<TakkenCategory, '其他'> } => stat.category !== '其他')
  .map((stat) => {
    const items = syllabusCoverage(stat.category)
    const maxError = Math.max(1, ...items.map((item) => item.errorCount))
    return { category: stat.category, items, matchedCount: items.filter((item) => item.matched).length, total: items.length, maxError }
  })
  .filter((entry) => entry.total > 0))
</script>

<template>
  <div class="page-surface takken-page">
    <section class="page-hero compact">
      <div class="container">
        <span class="eyebrow">宅建考试刷题</span>
        <h1>薄弱分析</h1>
        <p>上传外部刷题网站导出的真实练习记录，按正确率找出薄弱科目和考点；下方还保留了本站错题库自己的统计，两份数据分开展示。</p>
      </div>
    </section>

    <section class="section">
      <div class="container takken-shell">
        <TakkenSubnav />

        <div class="takken-countdown">
          <div v-if="examDate && daysLeft !== null" class="takken-countdown-number">
            <strong>{{ Math.abs(daysLeft) }}</strong>
            <span>{{ daysLeft > 0 ? '天后考试' : daysLeft === 0 ? '就是今天' : '天前已考试' }}</span>
          </div>
          <div v-else class="takken-countdown-empty">设置考试日期，开始倒计时</div>
          <el-date-picker v-model="examDateModel" type="date" value-format="YYYY-MM-DD" format="YYYY/MM/DD" placeholder="选择宅建考试日期" />
        </div>

        <h2 class="takken-section-title">上传练习记录（CSV）</h2>
        <p class="takken-hint">支持 takken-siken.com 等刷题网站导出的记录（需要包含"学習日/出典/正誤/分野/細目"这些列），自动识别 Shift-JIS 编码。数据只存在本机浏览器里，不会上传到服务器；重新选择文件会覆盖上一次的记录。</p>
        <div class="takken-upload">
          <input ref="fileInput" type="file" accept=".csv,text/csv" class="takken-upload-input-hidden" @change="handleFileChange">
          <el-button size="large" :loading="uploading" @click="pickFile"><el-icon><UploadFilled /></el-icon>{{ uploadPayload ? '重新上传 CSV' : '选择 CSV 文件' }}</el-button>
          <div v-if="uploadPayload" class="takken-upload-meta">
            <span>已加载 <strong>{{ uploadPayload.fileName }}</strong> · {{ uploadPayload.records.length }} 条记录</span>
            <button type="button" class="text-link" @click="removeUpload"><el-icon><Delete /></el-icon>清除</button>
          </div>
          <p v-if="uploadError" class="takken-upload-error">{{ uploadError }}</p>
        </div>

        <template v-if="uploadPayload && csvOverall">
          <div class="takken-stats">
            <div class="takken-stat"><strong>{{ csvOverall.total }}</strong><span>CSV 练习总题数</span></div>
            <div class="takken-stat"><strong>{{ csvAccuracy(csvOverall) }}%</strong><span>真实正确率</span></div>
            <div class="takken-stat"><strong>{{ csvOverall.total - csvOverall.correct }}</strong><span>CSV 中的错题数</span></div>
          </div>

          <h2 class="takken-section-title">按大科目看真实正确率（按正确率从低到高）</h2>
          <p class="takken-hint">数据来自你上传的 CSV，涵盖了做对和做错的完整记录，比只看错题库更能反映真实水平。</p>
          <div class="takken-category-grid">
            <div v-for="stat in csvCategoryStats" :key="stat.category" class="takken-category-card">
              <div class="takken-category-card-head">
                <span>{{ stat.category }}</span>
                <span class="takken-category-card-count">{{ stat.correct }} / {{ stat.total }} 题</span>
              </div>
              <div class="takken-progress-track"><i :class="{ warn: csvAccuracy(stat) < 60 }" :style="{ width: `${csvAccuracy(stat)}%` }" /></div>
              <div class="takken-category-card-foot">
                <span :class="csvAccuracy(stat) < 60 ? 'takken-weak-badge' : 'takken-ok-badge'">正确率 {{ csvAccuracy(stat) }}%</span>
              </div>
            </div>
          </div>

          <h2 class="takken-section-title">按细目看真实正确率（按正确率从低到高）</h2>
          <div class="takken-table" style="--takken-table-cols: 4">
            <div class="takken-table-row takken-table-row--head">
              <div class="takken-table-cell">科目</div>
              <div class="takken-table-cell">细目</div>
              <div class="takken-table-cell">练习数</div>
              <div class="takken-table-cell">正确率</div>
            </div>
            <div v-for="stat in csvSubStats" :key="`${stat.category}-${stat.subItem}`" class="takken-table-row">
              <div class="takken-table-cell"><span class="takken-table-cell-label">科目</span>{{ stat.category }}</div>
              <div class="takken-table-cell"><span class="takken-table-cell-label">细目</span>{{ stat.subItem }}</div>
              <div class="takken-table-cell"><span class="takken-table-cell-label">练习数</span>{{ stat.correct }} / {{ stat.total }}</div>
              <div class="takken-table-cell">
                <span class="takken-table-cell-label">正确率</span>
                <span :class="csvAccuracy(stat) < 60 ? 'takken-weak-badge' : 'takken-ok-badge'">{{ csvAccuracy(stat) }}%</span>
              </div>
            </div>
          </div>
        </template>

        <div class="takken-stats">
          <div class="takken-stat"><strong>{{ totalMistakes }}</strong><span>原始错题数量</span></div>
          <div class="takken-stat"><strong>{{ reviewedCount }}</strong><span>已复习数量</span></div>
          <div class="takken-stat"><strong>{{ needsReviewTotal }}</strong><span>仍需复习数量</span></div>
          <div class="takken-stat"><strong>{{ masteredTotal }}</strong><span>已掌握数量</span></div>
        </div>
        <p class="takken-hint">"原始错题"是你录入题库的每一题（本身都曾经做错过）；"已复习"是在本站至少重新做过一次；连续答对 2 次以上记为"已掌握"，只要再答错一次就会重新回到"仍需复习"。</p>

        <h2 class="takken-section-title">按大科目看错题库（考试参考共 {{ TAKKEN_EXAM_TOTAL_QUESTIONS }} 题，按原始错题数量从高到低）</h2>
        <div class="takken-category-grid">
          <div v-for="stat in sortedCategoryStats" :key="stat.category" class="takken-category-card">
            <div class="takken-category-card-head">
              <span>{{ stat.category }}</span>
              <span class="takken-category-card-count">考试参考 {{ stat.weight ?? '—' }} 题</span>
            </div>
            <div class="takken-category-card-counts">
              <span>原始错题 <strong>{{ stat.total }}</strong></span>
              <span>已复习 <strong>{{ stat.reviewed }}</strong></span>
              <span class="takken-weak-badge">仍需复习 <strong>{{ stat.needsReview }}</strong></span>
              <span class="takken-ok-badge">已掌握 <strong>{{ stat.mastered }}</strong></span>
            </div>
          </div>
        </div>

        <h2 class="takken-section-title">考点覆盖情况（参考主流教材目录，非官方数据）</h2>
        <p class="takken-hint">每个科目常见知识点的参考清单，按错题数从高到低排列。灰色条代表"还没有相关错题"——可能是已经掌握，也可能是还没考到过，需要你自己判断，不是数值越高越差的绝对指标。</p>
        <details v-for="entry in coverageByCategory" :key="entry.category" class="takken-toc takken-coverage">
          <summary>
            <span>{{ entry.category }}</span>
            <span class="takken-coverage-ratio">{{ entry.matchedCount }} / {{ entry.total }} 个考点已出现错题</span>
          </summary>
          <div class="takken-heat-list">
            <div v-for="item in entry.items" :key="item.label" class="takken-heat-row" :class="{ zero: item.errorCount === 0 }">
              <div class="takken-heat-label">
                <span>{{ item.label }}</span>
                <span v-if="item.matchedTags.length" class="takken-heat-source">{{ item.matchedTags.join('、') }}</span>
              </div>
              <div class="takken-heat-bar-track"><div class="takken-heat-bar" :style="{ width: `${(item.errorCount / entry.maxError) * 100}%` }" /></div>
              <div class="takken-heat-count">{{ item.errorCount }} 题</div>
            </div>
          </div>
        </details>

        <h2 class="takken-section-title">薄弱分析表（按仍需复习数量从高到低）</h2>
        <div class="takken-table" style="--takken-table-cols: 6">
          <div class="takken-table-row takken-table-row--head">
            <div class="takken-table-cell">科目</div>
            <div class="takken-table-cell">考点</div>
            <div class="takken-table-cell">原始错题</div>
            <div class="takken-table-cell">仍需复习</div>
            <div class="takken-table-cell">已掌握</div>
            <div class="takken-table-cell">操作</div>
          </div>
          <div v-for="stat in rankedTagStats" :key="stat.tag" class="takken-table-row">
            <div class="takken-table-cell"><span class="takken-table-cell-label">科目</span>{{ stat.category }}</div>
            <div class="takken-table-cell"><span class="takken-table-cell-label">考点</span>{{ takkenTagLabel(stat.tag) }}</div>
            <div class="takken-table-cell"><span class="takken-table-cell-label">原始错题</span><strong class="takken-mistake-count">{{ stat.total }}</strong></div>
            <div class="takken-table-cell">
              <span class="takken-table-cell-label">仍需复习</span>
              <span v-if="stat.needsReview > 0" class="takken-weak-badge">{{ stat.needsReview }}</span>
              <span v-else class="takken-muted-badge">0</span>
            </div>
            <div class="takken-table-cell">
              <span class="takken-table-cell-label">已掌握</span>
              <span v-if="stat.mastered > 0" class="takken-ok-badge">{{ stat.mastered }}</span>
              <span v-else class="takken-muted-badge">0</span>
            </div>
            <div class="takken-table-cell">
              <span class="takken-table-cell-label">操作</span>
              <button type="button" class="text-link" @click="practiceTag(stat.tag)">去练习<el-icon><ArrowRight /></el-icon></button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
