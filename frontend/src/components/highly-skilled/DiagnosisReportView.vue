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
  japaneseN2: ['日语能力 N2 等', '日本語能力 N2等'], innovationOrganization: ['创新促进支援机构', 'イノベーション促進支援機関'],
  innovationSme: ['对象中小企业追加', '対象中小企業の追加'], growthField: ['指定成长领域尖端事业', '指定成長分野の先端事業'],
  localGovernmentSupport: ['地方公共团体支援措施', '地方公共団体の支援措置'], foreignQualification: ['指定外国资格・表彰', '指定外国資格・表彰'],
  evidence: ['加分证明材料', '加点の証明資料'], university: ['毕业院校资格', '卒業大学の資格'],
  activity: ['活动符合性', '活動該当性'],
}
const suggestionLabels: Record<string, [string, string]> = {
  prepareEvidence: ['优先逐项准备学位、职历、年收及各加分项目证明。', '学歴、職歴、年収、各加点項目の証明を優先して準備してください。'],
  japaneseN2: ['可确认JLPT N2、BJT 400分以上等日语档位。', 'JLPT N2、BJT 400点以上等の区分を確認できます。'],
  japaneseN1Upgrade: ['当前为N2档位，可确认N1或BJT更高档位。', 'N2区分からN1・BJT上位区分を確認できます。'],
  verifyUniversity: ['请使用毕业证明上的正式英文校名重新搜索或人工确认。', '卒業証明書の正式英語名で再検索するか、個別確認してください。'],
  experience3: ['可证明的相关职历达到3年后可能进入首个加分区间。', '証明可能な関連実務経験が3年に達すると加点区分に入る可能性があります。'],
  income400: ['预计年收入达到相应年龄档位后可能增加积分。', '年齢区分に対応する予定年収に達すると加点の可能性があります。'],
  multipleDegrees: ['核对不同专业领域的多个学位加分。', '異なる分野の複数学位加点を確認してください。'],
  educationReview: ['请用毕业证明和学位证明确认学历。', '卒業証明・学位証明で学歴を確認してください。'],
  activityReview: ['请人工确认预定活动是否属于所选活动类型。', '予定活動が選択した活動類型に該当するか個別確認してください。'],
  gapTo80: ['继续核对距离80分的差额及可证明项目。', '80点までの差と証明可能な項目を確認してください。'],
  qualificationReview: ['按预定职务确认直接相关的日本国家资格。', '予定職務に直接関連する日本の国家資格を確認してください。'],
  researchEvidence: ['优先准备专利、研究资助决定或论文检索资料。', '特許、研究費採択、論文検索資料を優先して準備してください。'],
  japaneseDegreeN2Exclusion: ['已勾选日本高等教育机构学位，N2档日语分按规则不重复计入；N1档不受此排除。', '日本の高等教育機関の学位を選択したため、N2区分は重複加点しません。N1区分は除外対象外です。'],
  japaneseDegreeSelection: ['如确实在日本高等教育机构取得学位，可勾选该独立项目。', '日本の高等教育機関で学位を取得した場合は、独立項目として選択できます。'],
}
function itemLabel(key: string) { return itemLabels[key]?.[zh ? 0 : 1] ?? key }
function suggestionLabel(key: string) { return suggestionLabels[key]?.[zh ? 0 : 1] ?? key }
function statusLabel(status: string) {
  if (status === 'confirmed') return zh ? '已计入' : '加点済み'
  if (status === 'pending') return zh ? '待确认' : '確認待ち'
  return zh ? '因排除关系未重复计入' : '重複不可のため未加点'
}
function activityLabel(activity: string) {
  const labels: Record<string, [string, string]> = {
    academic: ['高度学术研究活动（1号イ）', '高度学術研究活動（1号イ）'],
    professional: ['高度专业・技术活动（1号ロ）', '高度専門・技術活動（1号ロ）'],
    management: ['高度经营・管理活动（1号ハ）', '高度経営・管理活動（1号ハ）'],
  }
  return labels[activity]?.[zh ? 0 : 1] ?? activity
}
function formatDate(value: string) { return value.slice(0, 10).replace(/-/g, '/') }
function formatIncome(value: number) {
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
        <div><span>{{ zh ? '姓名' : '氏名' }}</span><strong>{{ report.applicant.name }}</strong></div>
        <div><span>{{ zh ? '电话' : '電話' }}</span><strong>{{ report.applicant.maskedPhone }}</strong></div>
        <div><span>{{ zh ? '出生日期 / 年龄' : '生年月日 / 年齢' }}</span><strong>{{ formatDate(report.applicant.birthDate) }} / {{ report.applicant.age }}</strong></div>
        <div><span>{{ zh ? '诊断基准日' : '診断基準日' }}</span><strong>{{ formatDate(report.diagnosis.diagnosisDate) }}</strong></div>
        <div><span>{{ zh ? '活动类型' : '活動類型' }}</span><strong>{{ activityLabel(report.diagnosis.activity) }}</strong></div>
        <div><span>{{ zh ? '预计年收入' : '予定年収' }}</span><strong>{{ formatIncome(report.diagnosis.inputSnapshot.annualIncome) }}</strong></div>
      </div>
      <ScoreProgressChart :confirmed="report.scoreChart.confirmed" :pending="report.scoreChart.pending" :locale="report.locale" />
      <div class="report-status-grid">
        <span>{{ zh ? '70分状态' : '70点状態' }}<strong>{{ report.result.meetsPointThreshold ? (zh ? '确定达到' : '確定到達') : report.result.maximumMeetsPointThreshold ? (zh ? '待确认成立后可能达到' : '確認成立後に到達可能') : (zh ? '尚未达到' : '未到達') }}</strong></span>
        <span>{{ zh ? '80分状态' : '80点状態' }}<strong>{{ report.result.confirmedMeets80 ? (zh ? '确定达到' : '確定到達') : report.result.maximumMeets80 ? (zh ? '待确认成立后可能达到' : '確認成立後に到達可能') : (zh ? '尚未达到' : '未到達') }}</strong></span>
        <span>{{ zh ? '最低年收入' : '最低年収' }}<strong>{{ report.result.meetsIncomeRequirement ? (zh ? '已满足' : '充足') : (zh ? '不足' : '不足') }}</strong></span>
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
          <b>{{ item.points ? `+${item.points}` : '0' }}</b>
          <small>{{ statusLabel(item.status) }}</small>
        </div>
      </div>
    </section>

    <UniversityAssessmentCard v-if="report.universityAssessment" :assessment="report.universityAssessment" :locale="report.locale" />

    <section class="report-card">
      <h2>{{ zh ? '改善与准备建议' : '改善・準備提案' }}</h2>
      <div class="report-recommendations">
        <div v-for="item in report.recommendations" :key="item.key">
          <el-tag :type="item.priority === 'high' ? 'warning' : 'info'">{{ item.priority === 'high' ? (zh ? '优先确认' : '優先確認') : (zh ? '可以改善' : '改善可能') }}</el-tag>
          <p>{{ suggestionLabel(item.key) }}</p>
        </div>
      </div>
    </section>

    <footer class="report-disclaimer">{{ report.disclaimer }}</footer>
  </article>
</template>
