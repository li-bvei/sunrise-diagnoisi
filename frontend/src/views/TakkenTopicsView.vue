<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowUp, Search, Star, WarningFilled } from '@element-plus/icons-vue'
import TakkenBilingualText from '@/components/takken/TakkenBilingualText.vue'
import TakkenSubnav from '@/components/takken/TakkenSubnav.vue'
import TakkenTagFilter from '@/components/takken/TakkenTagFilter.vue'
import type { TakkenTopic } from '@/types/takken'
import { TAKKEN_TOPICS } from '@/utils/takkenData'
import { classifyTakkenTag, takkenTagLabel, type TakkenCategory } from '@/utils/takkenCategories'

const topics = TAKKEN_TOPICS
const allTags = topics.map((topic) => topic.tag)
const sprintTopicCount = topics.filter((topic) => topic.examSprint).length

const selectedCategory = ref<TakkenCategory | null>(null)
const selectedTag = ref<string | null>(null)
const searchKeyword = ref('')

const route = useRoute()
const router = useRouter()
// "考前冲刺" is its own bookmarkable place (?sprint=1), not just a filter you have to
// re-discover each time — most topics already contain a "trap" callout, so filtering on that
// wouldn't narrow anything down; this flag marks the small set of condensed, multi-item cram
// summaries (number traps, wording traps, repeated-mistake lists, linked-topic networks) that
// are actually meant for fast pre-exam scanning.
const sprintOnly = ref(route.query.sprint === '1')
watch(sprintOnly, (value) => {
  void router.replace({ query: { ...route.query, sprint: value ? '1' : undefined } })
})

function matchesKeyword(topic: TakkenTopic, keyword: string): boolean {
  const haystack = [topic.title.zh, topic.title.ja, topic.tag, takkenTagLabel(topic.tag), topic.source]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(keyword)
}

const filteredTopics = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  return topics.filter((topic) => {
    if (sprintOnly.value && !topic.examSprint) return false
    if (selectedTag.value && topic.tag !== selectedTag.value) return false
    if (!selectedTag.value && selectedCategory.value && classifyTakkenTag(topic.tag) !== selectedCategory.value) return false
    if (keyword && !matchesKeyword(topic, keyword)) return false
    return true
  })
})

const currentIndex = ref(0)
watch([selectedCategory, selectedTag, searchKeyword, sprintOnly], () => { currentIndex.value = 0 })

const currentTopic = computed<TakkenTopic | undefined>(() => filteredTopics.value[currentIndex.value])
const progressLabel = computed(() => (filteredTopics.value.length === 0 ? '' : `${currentIndex.value + 1} / ${filteredTopics.value.length}`))

function goPrev() {
  if (currentIndex.value > 0) currentIndex.value -= 1
}
function goNext() {
  if (currentIndex.value < filteredTopics.value.length - 1) currentIndex.value += 1
}
function jumpTo(topicId: string) {
  const index = filteredTopics.value.findIndex((topic) => topic.id === topicId)
  if (index >= 0) currentIndex.value = index
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const showBackToTop = ref(false)
function onScroll() {
  showBackToTop.value = window.scrollY > 360
}
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
function backToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="page-surface takken-page">
    <section class="page-hero compact takken-hero">
      <div class="container takken-hero-inner">
        <div class="takken-hero-text">
          <span class="eyebrow">宅建考试刷题</span>
          <h1>宅建考点速查</h1>
        </div>
        <div class="takken-hero-actions">
          <el-button :type="sprintOnly ? 'primary' : 'default'" size="large" @click="sprintOnly = !sprintOnly">
            🔥 考前冲刺专项（{{ sprintTopicCount }}）
          </el-button>
          <span class="takken-hero-status">数字陷阱・文字陷阱・反复出错清单・关联考点网络</span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container takken-shell">
        <TakkenSubnav />

        <el-input
          v-model="searchKeyword"
          class="takken-search"
          size="large"
          clearable
          placeholder="搜索考点标题、关键词，比如「借地借家法」"
          :prefix-icon="Search"
        />

        <TakkenTagFilter
          :tags="allTags"
          :category="selectedCategory"
          :tag="selectedTag"
          @update:category="selectedCategory = $event"
          @update:tag="selectedTag = $event"
        />

        <details v-if="filteredTopics.length > 0" class="takken-toc">
          <summary>考点目录（点击跳转，共 {{ filteredTopics.length }} 条）</summary>
          <ol>
            <li v-for="(topic, index) in filteredTopics" :key="topic.id">
              <a href="javascript:void(0)" :class="{ active: index === currentIndex }" @click="jumpTo(topic.id)">{{ topic.title.zh }}</a>
            </li>
          </ol>
        </details>

        <div v-if="!currentTopic" class="takken-empty">
          <el-icon :size="34"><WarningFilled /></el-icon>
          <h3>没有找到匹配的考点</h3>
          <p>换个关键词，或者切换到其他分类、选择"全部类型"。</p>
        </div>

        <template v-else>
          <div class="filter-bar takken-mode-bar"><span /><span>{{ progressLabel }}</span></div>

          <article :id="currentTopic.id" class="takken-topic">
            <span class="takken-tag">{{ currentTopic.tag }}</span>
            <h2><TakkenBilingualText :content="currentTopic.title" /></h2>
            <p class="takken-topic-source">来源题目：{{ currentTopic.source }}</p>

            <div v-for="(section, sectionIndex) in currentTopic.sections" :key="sectionIndex" class="takken-topic-section">
              <h3>{{ section.heading }}</h3>
              <template v-for="(block, blockIndex) in section.blocks" :key="blockIndex">
                <p v-if="block.type === 'text'" class="takken-topic-text"><TakkenBilingualText :content="block.content" /></p>

                <ul v-else-if="block.type === 'list' && block.style === 'unordered'" class="takken-topic-list">
                  <li v-for="(item, itemIndex) in block.items" :key="itemIndex"><TakkenBilingualText :content="item" /></li>
                </ul>
                <ol v-else-if="block.type === 'list' && block.style === 'ordered'" class="takken-topic-list">
                  <li v-for="(item, itemIndex) in block.items" :key="itemIndex"><TakkenBilingualText :content="item" /></li>
                </ol>

                <div v-else-if="block.type === 'table'" class="takken-table" :style="{ '--takken-table-cols': block.headers.length }">
                  <div class="takken-table-row takken-table-row--head">
                    <div v-for="(header, headerIndex) in block.headers" :key="headerIndex" class="takken-table-cell">
                      <TakkenBilingualText :content="header" />
                    </div>
                  </div>
                  <div v-for="(row, rowIndex) in block.rows" :key="rowIndex" class="takken-table-row">
                    <div v-for="(cell, cellIndex) in row" :key="cellIndex" class="takken-table-cell">
                      <span class="takken-table-cell-label">{{ block.headers[cellIndex]?.zh }}</span>
                      <TakkenBilingualText :content="cell" />
                    </div>
                  </div>
                </div>

                <div v-else-if="block.type === 'mnemonic'" class="takken-mnemonic-block"><el-icon><Star /></el-icon><TakkenBilingualText :content="block.content" /></div>
                <div v-else-if="block.type === 'trap'" class="takken-trap-block"><el-icon><WarningFilled /></el-icon><TakkenBilingualText :content="block.content" /></div>
              </template>
            </div>
          </article>
        </template>
      </div>
    </section>

    <div v-if="filteredTopics.length > 0" class="takken-bottom-nav">
      <div class="container takken-bottom-nav-inner">
        <el-button size="large" :disabled="currentIndex === 0" @click="goPrev">上一条</el-button>
        <el-button type="primary" size="large" :disabled="currentIndex >= filteredTopics.length - 1" @click="goNext">下一条</el-button>
      </div>
    </div>

    <button v-if="showBackToTop" type="button" class="takken-back-to-top" aria-label="回到顶部" @click="backToTop">
      <el-icon :size="18"><ArrowUp /></el-icon>
    </button>
  </div>
</template>
