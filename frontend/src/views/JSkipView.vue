<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ArrowRight, Check, InfoFilled, WarningFilled } from '@element-plus/icons-vue'
import { useSettingsStore } from '@/stores/settings'
import { calculateJSkip } from '@/utils/jSkipCalculator'
import type { EducationLevel, HighlySkilledActivity } from '@/types/highlySkilled'
import type { JSkipResult } from '@/types/jSkip'

const settings = useSettingsStore()
const zh = computed(() => settings.locale === 'zh-CN')
const result = ref<JSkipResult | null>(null)
const form = reactive({
  activity: 'professional' as HighlySkilledActivity,
  education: 'other' as EducationLevel,
  experienceYears: 0,
  annualIncome: 0,
  baseActivityConfirmed: false,
})

const activities = computed(() => zh.value ? [
  { value: 'academic', title: '大学、研究机构或专业研究工作', scheme: '高度専門職1号イ' },
  { value: 'professional', title: '企业技术、专业知识或国际业务工作', scheme: '高度専門職1号ロ' },
  { value: 'management', title: '公司经营或管理工作', scheme: '高度専門職1号ハ' },
] : [
  { value: 'academic', title: '大学・研究機関等で研究や教育を行う方', scheme: '高度専門職1号イ' },
  { value: 'professional', title: '企業で技術・専門業務に従事する方', scheme: '高度専門職1号ロ' },
  { value: 'management', title: '会社を経営・管理する方', scheme: '高度専門職1号ハ' },
])

function diagnose() {
  result.value = calculateJSkip(form)
  requestAnimationFrame(() => document.querySelector('.jskip-result')?.scrollIntoView({ behavior: 'smooth' }))
}
</script>

<template>
  <div class="page-surface">
    <section class="detail-hero">
      <div class="container detail-hero-grid">
        <div>
          <span class="eyebrow">J-Skip</span>
          <h1>{{ zh ? '特别高度人才J-Skip诊断' : '特別高度人材J-Skip診断' }}</h1>
          <p>{{ zh ? 'J-Skip不使用70分积分。这里仅按活动类型、学历或职历、预计年收入进行独立基础判断。' : 'J-Skipは70点のポイント計算を使いません。活動類型、学歴または職歴、予定年収から独立して基礎判定します。' }}</p>
          <div class="detail-tags"><el-tag type="success" round>{{ zh ? '可使用' : '利用可能' }}</el-tag><span>{{ zh ? '约3分钟' : '約3分' }}</span></div>
        </div>
        <aside class="rule-card">
          <span>{{ zh ? '官方标准核对：2026年7月' : '公式基準確認：2026年7月' }}</span>
          <p>{{ zh ? '学术研究・专业技术：年收2,000万日元，并满足硕士以上或10年以上相关职历。经营管理：年收4,000万日元且5年以上相关职历。' : 'イ・ロ：年収2,000万円以上＋修士以上または関連職歴10年以上。ハ：年収4,000万円以上＋関連職歴5年以上。' }}</p>
          <a href="https://www.moj.go.jp/isa/applications/resources/nyuukokukanri01_00009.html" target="_blank" rel="noopener">{{ zh ? '查看入管厅J-Skip说明' : '入管庁のJ-Skip説明を見る' }}<el-icon><ArrowRight /></el-icon></a>
        </aside>
      </div>
    </section>

    <section class="section"><div class="container narrow-container">
      <div class="calculator-panel">
        <div class="panel-heading"><span>01</span><div><h2>{{ zh ? '填写J-Skip判断条件' : 'J-Skipの判定条件を入力' }}</h2><p>{{ zh ? '本页面采用条件判断，不采用70分积分制。' : 'このページは要件判定方式で、70点のポイント制は使用しません。' }}</p></div></div>
        <el-form label-position="top">
          <el-form-item :label="zh ? '活动类型' : '活動類型'">
            <div class="jskip-activity-options">
              <label v-for="item in activities" :key="item.value" :class="{ selected: form.activity === item.value }">
                <el-radio v-model="form.activity" :value="item.value"><strong>{{ item.title }}</strong></el-radio><small>{{ item.scheme }}</small>
              </label>
            </div>
          </el-form-item>
          <div class="form-grid">
            <el-form-item v-if="form.activity !== 'management'" :label="zh ? '学历' : '学歴'">
              <el-select v-model="form.education">
                <el-option :label="zh ? '本科' : '学士'" value="bachelor" />
                <el-option :label="zh ? '硕士' : '修士'" value="master" />
                <el-option :label="zh ? '博士' : '博士'" value="doctorate" />
                <el-option :label="zh ? '专业职学位' : '専門職学位'" value="professional_degree" />
                <el-option :label="zh ? '其他或不确定' : 'その他・不明'" value="other" />
              </el-select>
            </el-form-item>
            <el-form-item :label="zh ? '相关实务经验' : '関連実務経験'"><el-input-number v-model="form.experienceYears" :min="0" :max="70" :controls="false" /><span class="field-unit simple">{{ zh ? '年' : '年' }}</span></el-form-item>
            <el-form-item :label="zh ? '预计年收入' : '予定年収'"><el-input-number v-model="form.annualIncome" :min="0" :max="100000" :step="100" :controls="false" /><span class="field-unit simple">{{ zh ? '万日元' : '万円' }}</span></el-form-item>
          </div>
          <div class="base-confirm"><el-checkbox v-model="form.baseActivityConfirmed">{{ zh ? '我已确认拟从事活动本身属于所选高度专业职活动类型' : '予定する活動が選択した高度専門職の活動類型に該当することを確認しました' }}</el-checkbox></div>
          <div class="calculator-actions end"><el-button type="primary" size="large" @click="diagnose">{{ zh ? '进行J-Skip基础判断' : 'J-Skip基礎判定を行う' }}<el-icon><ArrowRight /></el-icon></el-button></div>
        </el-form>
      </div>

      <div v-if="result" class="jskip-result calculator-result">
        <div class="result-status" :class="{ success: result.eligible }">
          <el-icon><Check v-if="result.eligible" /><WarningFilled v-else /></el-icon>
          <div><span>{{ zh ? 'J-Skip基础判断' : 'J-Skip基礎判定' }}</span><h2>{{ result.eligible ? (zh ? '当前输入满足基础条件' : '入力内容は基礎要件を満たします') : (zh ? '当前输入尚未满足全部基础条件' : '入力内容は全ての基礎要件を満たしていません') }}</h2></div>
        </div>
        <div class="criteria-list">
          <div :class="{ met: result.meetsIncome }"><el-icon><Check /></el-icon><span>{{ zh ? '预计年收入标准' : '予定年収基準' }}</span><strong>{{ result.meetsIncome ? (zh ? '满足' : '充足') : `${zh ? '还差' : 'あと'} ${result.missingIncome} ${zh ? '万日元' : '万円'}` }}</strong></div>
          <div :class="{ met: result.meetsEducationOrExperience }"><el-icon><Check /></el-icon><span>{{ form.activity === 'management' ? (zh ? '经营管理职历标准' : '経営・管理職歴基準') : (zh ? '硕士以上或10年相关职历' : '修士以上または関連職歴10年') }}</span><strong>{{ result.meetsEducationOrExperience ? (zh ? '满足' : '充足') : `${zh ? '职历还差' : '職歴あと'} ${result.missingExperience} ${zh ? '年' : '年'}` }}</strong></div>
          <div :class="{ met: form.baseActivityConfirmed }"><el-icon><Check /></el-icon><span>{{ zh ? '基础活动符合性确认' : '活動該当性の確認' }}</span><strong>{{ form.baseActivityConfirmed ? (zh ? '已确认' : '確認済み') : (zh ? '未确认' : '未確認') }}</strong></div>
        </div>
        <section class="result-disclaimer"><el-icon><InfoFilled /></el-icon><div><h3>{{ zh ? '判断边界' : '判定の範囲' }}</h3><p>{{ zh ? '该结果不包含积分，不代表许可决定。学历、职历、年收及活动内容均需以申请材料证明，并由入管厅最终审查。' : 'ポイント計算ではなく、許可判断でもありません。学歴、職歴、年収、活動内容は資料で立証し、入管庁の審査を受ける必要があります。' }}</p></div></section>
      </div>
    </div></section>
  </div>
</template>
