<script setup lang="ts">
import ScoreProgressChart from './ScoreProgressChart.vue'
import ScoreBreakdownChart from './ScoreBreakdownChart.vue'
import UniversityAssessmentCard from './UniversityAssessmentCard.vue'
import type { DiagnosisReport } from '@/types/highlySkilled'

const props = defineProps<{ report: DiagnosisReport }>()
const zh = props.report.locale === 'zh-CN'
const itemLabels: Record<string, [string, string]> = {
  education: ['学历', '学歴'], experience: ['相关职历', '関連職歴'], income: ['预计年收入', '予定年収'],
  age: ['年龄', '年齢'], research: ['研究成果', '研究実績'], qualification: ['日本国家资格', '日本の国家資格'],
  representative: ['代表职位', '代表者の地位'], director: ['董事・执行职位', '取締役・執行役'],
  multipleDegrees: ['不同领域多个学位', '複数分野の学位'], japaneseUniversity: ['日本高等教育机构学位', '日本の高等教育機関の学位'],
  topUniversity: ['指定大学名单', '指定大学一覧'], japaneseN1: ['日语能力 N1 等', '日本語能力 N1等'],
  japaneseN2: ['日语能力 N2 等', '日本語能力 N2等'], japaneseLanguage: ['日语能力加分', '日本語能力の加点'], innovationOrganization: ['创新促进支援机构', 'イノベーション促進支援機関'],
  innovationSme: ['对象中小企业追加', '対象中小企業の追加'], growthField: ['指定成长领域尖端事业', '指定成長分野の先端事業'],
  localGovernmentSupport: ['地方公共团体支援措施', '地方公共団体の支援措置'], foreignQualification: ['指定外国资格・表彰', '指定外国資格・表彰'],
  evidence: ['加分证明材料', '加点の証明資料'], university: ['毕业院校资格', '卒業大学の資格'],
  activity: ['活动符合性', '活動該当性'],
}
function itemLabel(key: string) { return itemLabels[key]?.[zh ? 0 : 1] ?? key }
function statusLabel(status: string) {
  if (status === 'included') return zh ? '已计入' : '算入済み'
  if (status === 'excluded') return zh ? '因排除关系未计入' : '重複不可のため未加点'
  if (status === 'not-applicable') return zh ? '不适用' : '対象外'
  if (status === 'unknown') return zh ? '未输入' : '未入力'
  return zh ? '未计入' : '未算入'
}
function activityLabel(activity: string) {
  const labels: Record<string, [string, string]> = {
    academic: ['高度学术研究活动（1号イ）', '高度学術研究活動（1号イ）'],
    professional: ['高度专业・技术活动（1号ロ）', '高度専門・技術活動（1号ロ）'],
    management: ['高度经营・管理活动（1号ハ）', '高度経営・管理活動（1号ハ）'],
  }
  return labels[activity]?.[zh ? 0 : 1] ?? activity
}
function formatDate(value: string) {
  if (!value.includes('T')) return value.slice(0, 10).replace(/-/g, '/')
  const date = new Date(value)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('/')
}
function formatIncome(value: number | null) {
  if (value === null) return zh ? '未输入' : '未入力'
  const manYen = value / 10_000
  const formatted = Number.isInteger(manYen) ? String(manYen) : manYen.toFixed(1).replace(/\.0$/, '')
  return `${formatted}${zh ? '万日元' : '万円'}`
}
</script>

<template>
  <article class="diagnosis-report">
    <header class="report-brand">
      <div><span>SUNRISE</span><h1>{{ zh ? '高度人才积分诊断报告' : '高度人材ポイント診断レポート' }}</h1></div>
      <small>{{ report.reportId }}<br>{{ formatDate(report.generatedAt) }}</small>
    </header>

    <section class="report-card report-overview">
      <div class="report-profile">
        <div><span>{{ zh ? '姓名' : '氏名' }}</span><strong>{{ report.applicant.name || (zh ? '未输入' : '未入力') }}</strong></div>
        <div><span>{{ zh ? '电话' : '電話' }}</span><strong>{{ report.applicant.maskedPhone || (zh ? '未填写' : '未記入') }}</strong></div>
        <div><span>{{ zh ? '出生日期 / 年龄' : '生年月日 / 年齢' }}</span><strong>{{ report.applicant.birthDate ? formatDate(report.applicant.birthDate) : (zh ? '未输入' : '未入力') }} / {{ report.applicant.age ?? (zh ? '未输入' : '未入力') }}</strong></div>
        <div><span>{{ zh ? '诊断基准日' : '診断基準日' }}</span><strong>{{ formatDate(report.diagnosis.diagnosisDate) }}</strong></div>
        <div><span>{{ zh ? '活动类型' : '活動類型' }}</span><strong>{{ activityLabel(report.diagnosis.activity) }}</strong></div>
        <div><span>{{ zh ? '预计年收入' : '予定年収' }}</span><strong>{{ formatIncome(report.diagnosis.inputSnapshot.annualIncome) }}</strong></div>
      </div>
      <ScoreProgressChart :total="report.scoreChart.totalPoints" :locale="report.locale" />
      <div class="report-status-grid">
        <span>{{ zh ? (report.result.items.some(item => item.status === 'unknown') ? '已确认分数' : '预计总分') : (report.result.items.some(item => item.status === 'unknown') ? '確認済みポイント' : '予想ポイント') }}<strong>{{ report.result.totalPoints }}{{ zh ? '分' : '点' }}</strong></span>
        <span>{{ zh ? '70分状态' : '70点状態' }}<strong>{{ report.result.reaches70 ? (zh ? '已达到' : '到達') : (zh ? `还差${report.result.pointsTo70}分` : `あと${report.result.pointsTo70}点`) }}</strong></span>
        <span>{{ zh ? '80分状态' : '80点状態' }}<strong>{{ report.result.reaches80 ? (zh ? '已达到' : '到達') : (zh ? `还差${report.result.pointsTo80}分` : `あと${report.result.pointsTo80}点`) }}</strong></span>
        <span>{{ zh ? '最低年收入' : '最低年収' }}<strong>{{ report.result.meetsIncomeRequirement === null ? (zh ? '未输入' : '未入力') : report.result.meetsIncomeRequirement ? (zh ? '已满足' : '充足') : (zh ? '不足' : '不足') }}</strong></span>
      </div>
    </section>

    <section class="report-card">
      <h2>{{ zh ? '积分构成' : 'ポイント構成' }}</h2>
      <ScoreBreakdownChart :rows="report.categoryChart" :locale="report.locale" />
    </section>

    <section class="report-card">
      <h2>{{ zh ? '积分明细' : 'ポイント明細' }}</h2>
      <div class="report-breakdown">
        <div v-for="item in report.breakdown" :key="item.key">
          <strong>{{ itemLabel(item.key) }}</strong>
          <b>{{ item.status === 'unknown' ? (zh ? '待确认' : '未確認') : item.points ? `+${item.points}` : '0' }}</b>
          <small>{{ statusLabel(item.status) }}</small>
        </div>
      </div>
    </section>

    <UniversityAssessmentCard v-if="report.universityAssessment" :assessment="report.universityAssessment" :locale="report.locale" />

  </article>
</template>
