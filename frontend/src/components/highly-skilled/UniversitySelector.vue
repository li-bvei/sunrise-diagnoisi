<script setup lang="ts">
import { computed, watch } from 'vue'
import { Check, Search, WarningFilled } from '@element-plus/icons-vue'
import {
  countries, getUniversityDisplayName, searchUniversityRecords, universities, universityDatasetMetadata,
} from '@/data/universities'
import type { UniversitySelection } from '@/types/highlySkilled'

const props = defineProps<{
  locale: 'zh-CN' | 'ja-JP'
  educationAllowsBonus: boolean
}>()
const model = defineModel<UniversitySelection>({ required: true })
const search = computed(() => searchUniversityRecords(model.value.countryCode, model.value.searchText))
const selected = computed(() => universities.find((item) => item.id === model.value.universityId))
const zh = computed(() => props.locale === 'zh-CN')

watch(() => [model.value.countryCode, model.value.searchText], () => {
  if (selected.value && !search.value.results.some(({ university }) => university.id === selected.value?.id)) {
    model.value.universityId = null
  }
})

function choose(id: string) {
  model.value.universityId = id
}
</script>

<template>
  <section class="school-selector">
    <div class="subsection-heading">
      <div>
        <h3>{{ zh ? '加分院校名单查询' : '加点対象大学の検索' }}</h3>
        <p>{{ zh ? '此处只用于核对官方PDF中的大学名单加分，不会判断或修改日本高等教育机构学位选项。' : 'ここでは公式PDFの大学一覧加点のみを確認します。日本の高等教育機関の学位選択には影響しません。' }}</p>
      </div>
      <el-tag type="info" effect="plain">
        {{ universityDatasetMetadata.effectiveDate }} · {{ universityDatasetMetadata.universityCount }}
      </el-tag>
    </div>
    <div class="school-search-grid">
      <el-form-item :label="zh ? '毕业国家或地区' : '卒業した国・地域'">
        <el-select v-model="model.countryCode" filterable>
          <el-option v-for="country in countries" :key="country.code" :label="zh ? country.zh : country.ja" :value="country.code" />
        </el-select>
      </el-form-item>
      <el-form-item :label="zh ? '搜索学校名称' : '大学名を検索'">
        <el-input
          v-model="model.searchText"
          clearable
          :prefix-icon="Search"
          :placeholder="zh ? '中文、英文、日文或常用简称' : '日本語・英語・中国語・略称'"
        />
      </el-form-item>
    </div>

    <p v-if="search.tooMany" class="field-help">
      {{ zh ? `找到 ${search.total} 条结果，仅显示前 20 条，请继续输入缩小范围。` : `${search.total}件中、先頭20件のみ表示しています。入力を追加してください。` }}
    </p>
    <div v-if="model.searchText && search.results.length" class="school-results">
      <button
        v-for="match in search.results"
        :key="match.university.id"
        type="button"
        :class="{ selected: model.universityId === match.university.id }"
        @click="choose(match.university.id)"
      >
        <span>
          <strong>{{ getUniversityDisplayName(match.university, props.locale) }}</strong>
          <small v-if="getUniversityDisplayName(match.university, props.locale) !== match.university.officialName">{{ match.university.officialName }} · {{ match.university.countryCode }}</small>
          <small v-else>{{ match.university.countryCode }} · {{ zh ? '官方英文名称' : '公式英語名' }}</small>
          <small v-if="match.matchedName !== match.university.officialName">
            {{ zh ? '匹配名称' : '一致した名称' }}：{{ match.matchedName }}
          </small>
        </span>
        <el-icon v-if="model.universityId === match.university.id"><Check /></el-icon>
      </button>
    </div>

    <div v-if="selected" class="school-match success">
      <el-icon><Check /></el-icon>
      <div>
        <strong>{{ zh ? '已匹配当前官方加分名单，预计计入 10 分' : '現在の公式加点一覧に一致：10点を見込み計上' }}</strong>
        <p><strong>{{ getUniversityDisplayName(selected, props.locale) }}</strong><template v-if="getUniversityDisplayName(selected, props.locale) !== selected.officialName"> · {{ selected.officialName }}</template> · {{ selected.countryCode }}</p>
        <p>
          {{ selected.sourceDocument }} · {{ zh ? '第' : '' }}{{ selected.sourcePage }}{{ zh ? '页' : 'ページ' }}
          · {{ selected.effectiveDate }}
        </p>
        <p>{{ zh ? '匹配以稳定学校ID和PDF官方名称为准，中文名称仅用于显示和搜索。' : '照合は安定した大学IDとPDF公式名を基準とし、中国語名は表示・検索用です。' }}</p>
      </div>
    </div>
    <div v-else-if="model.searchText && !search.results.length" class="school-match warning">
      <el-icon><WarningFilled /></el-icon>
      <div>
        <strong>{{ zh ? '当前官方 PDF 数据中未找到匹配记录' : '現在の公式PDFデータに一致する記録が見つかりません' }}</strong>
        <p>{{ zh ? '当前内置大学名单中未匹配到该学校，因此本次未计入大学名单加分。请尝试使用学校正式英文名称重新搜索。' : '現在の内蔵大学リストでは該当校を確認できなかったため、今回の試算では大学リスト加点を計上していません。大学の正式な英語名称で再検索してください。' }}</p>
      </div>
    </div>
    <p v-if="!props.educationAllowsBonus" class="field-help">
      {{ zh ? '学历为“其他或不确定”时，院校匹配不会自动计分。' : '学歴が「その他・不明」の場合、大学が一致しても自動加点しません。' }}
    </p>
    <p class="school-source-note">
      {{ zh ? '数据版本：入管厅 2026 年 1 月名单，共 19 页、390 所、37 个国家及地区。申请时请再次确认最新版。' : 'データ版：入管庁2026年1月一覧（19ページ、390校、37か国・地域）。申請時に最新版をご確認ください。' }}
    </p>
    <a class="official-inline-link" :href="universityDatasetMetadata.officialSourceUrl" target="_blank" rel="noopener noreferrer">
      {{ zh ? '查看入管厅官方院校名单 PDF ↗' : '入管庁の公式大学一覧PDFを確認 ↗' }}
    </a>
  </section>
</template>
