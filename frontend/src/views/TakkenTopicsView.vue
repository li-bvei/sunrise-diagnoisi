<script setup lang="ts">
import { Star, WarningFilled } from '@element-plus/icons-vue'
import rawTopics from '@/data/takken-topics.json'
import type { TakkenTopic } from '@/types/takken'

const topics = rawTopics as TakkenTopic[]
</script>

<template>
  <div class="page-surface">
    <section class="page-hero compact">
      <div class="container">
        <span class="eyebrow">宅建考试刷题</span>
        <h1>宅建考点速查</h1>
        <p>按知识点整理的考前速查表，来自真题的核心逻辑、对比速查、记忆口诀与易错陷阱。</p>
      </div>
    </section>

    <section class="section">
      <div class="container takken-shell">
        <nav class="takken-subnav">
          <RouterLink to="/tools/takken" class="takken-subnav-link">刷题练习</RouterLink>
          <RouterLink to="/tools/takken-notes" class="takken-subnav-link">考点速查</RouterLink>
        </nav>

        <details class="takken-toc" open>
          <summary>考点目录（点击跳转）</summary>
          <ol>
            <li v-for="topic in topics" :key="topic.id"><a :href="`#${topic.id}`">{{ topic.title }}</a></li>
          </ol>
        </details>

        <article v-for="topic in topics" :id="topic.id" :key="topic.id" class="takken-topic">
          <span class="takken-tag">{{ topic.tag }}</span>
          <h2>{{ topic.title }}</h2>
          <p class="takken-topic-source">来源题目：{{ topic.source }}</p>

          <div v-for="(section, sectionIndex) in topic.sections" :key="sectionIndex" class="takken-topic-section">
            <h3>{{ section.heading }}</h3>
            <template v-for="(block, blockIndex) in section.blocks" :key="blockIndex">
              <p v-if="block.type === 'text'" class="takken-topic-text">{{ block.text }}</p>

              <ul v-else-if="block.type === 'list' && block.style === 'unordered'" class="takken-topic-list">
                <li v-for="(item, itemIndex) in block.items" :key="itemIndex">{{ item }}</li>
              </ul>
              <ol v-else-if="block.type === 'list' && block.style === 'ordered'" class="takken-topic-list">
                <li v-for="(item, itemIndex) in block.items" :key="itemIndex">{{ item }}</li>
              </ol>

              <div v-else-if="block.type === 'table'" class="takken-topic-table-wrap">
                <table class="takken-topic-table">
                  <thead><tr><th v-for="(header, headerIndex) in block.headers" :key="headerIndex">{{ header }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, rowIndex) in block.rows" :key="rowIndex">
                      <td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-else-if="block.type === 'mnemonic'" class="takken-mnemonic-block"><el-icon><Star /></el-icon><p>{{ block.text }}</p></div>
              <div v-else-if="block.type === 'trap'" class="takken-trap-block"><el-icon><WarningFilled /></el-icon><p>{{ block.text }}</p></div>
            </template>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
