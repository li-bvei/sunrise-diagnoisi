<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search, Star, WarningFilled } from '@element-plus/icons-vue'
import TakkenBilingualText from '@/components/takken/TakkenBilingualText.vue'
import TakkenSubnav from '@/components/takken/TakkenSubnav.vue'
import TakkenTagFilter from '@/components/takken/TakkenTagFilter.vue'
import rawTopics from '@/data/takken-topics.json'
import type { TakkenTopic } from '@/types/takken'
import { classifyTakkenTag, takkenTagLabel, type TakkenCategory } from '@/utils/takkenCategories'

const topics = rawTopics as TakkenTopic[]
const allTags = topics.map((topic) => topic.tag)

const selectedCategory = ref<TakkenCategory | null>(null)
const selectedTag = ref<string | null>(null)
const searchKeyword = ref('')

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
    if (selectedTag.value && topic.tag !== selectedTag.value) return false
    if (!selectedTag.value && selectedCategory.value && classifyTakkenTag(topic.tag) !== selectedCategory.value) return false
    if (keyword && !matchesKeyword(topic, keyword)) return false
    return true
  })
})
</script>

<template>
  <div class="page-surface">
    <section class="page-hero compact">
      <div class="container">
        <span class="eyebrow">宅建考试刷题</span>
        <h1>宅建考点速查</h1>
        <p>按知识点整理的考前速查表，日语原文在上、中文解析在下——考试只会出日语，先让眼睛熟悉它。</p>
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

        <details v-if="filteredTopics.length > 0" class="takken-toc" open>
          <summary>考点目录（点击跳转，共 {{ filteredTopics.length }} 条）</summary>
          <ol>
            <li v-for="topic in filteredTopics" :key="topic.id"><a :href="`#${topic.id}`">{{ topic.title.zh }}</a></li>
          </ol>
        </details>

        <div v-if="filteredTopics.length === 0" class="takken-empty">
          <el-icon :size="34"><WarningFilled /></el-icon>
          <h3>没有找到匹配的考点</h3>
          <p>换个关键词，或者切换到其他分类、选择"全部类型"。</p>
        </div>

        <article v-for="topic in filteredTopics" :id="topic.id" :key="topic.id" class="takken-topic">
          <span class="takken-tag">{{ topic.tag }}</span>
          <h2><TakkenBilingualText :content="topic.title" /></h2>
          <p class="takken-topic-source">来源题目：{{ topic.source }}</p>

          <div v-for="(section, sectionIndex) in topic.sections" :key="sectionIndex" class="takken-topic-section">
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
      </div>
    </section>
  </div>
</template>
