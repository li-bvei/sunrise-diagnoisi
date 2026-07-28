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
  prepareEvidence: ['恭喜，积分已经达标！接下来请把学历、工作经历、年收入和其他加分项目的证明文件都准备齐全，最终能不能通过还是要看材料能否证明这些内容。', 'おめでとうございます、基準点に到達しました！次は学歴・職歴・年収やその他の加点項目の証明書類を揃えましょう。最終的には資料で証明できるかどうかがポイントになります。'],
  japaneseN2: ['如果您有JLPT N2或同等日语能力证明（比如BJT商务日语考试400分以上），补充这一项可以多加10分。', 'JLPT N2やBJT400点以上など同等の日本語能力証明をお持ちなら、この項目を追加することで10点増える可能性があります。'],
  japaneseN1Upgrade: ['现在是按N2档位计分的，如果实际已达到N1水平（或BJT 480分以上），可以确认能否升到更高档位加分。', '現在はN2区分で計算しています。N1、またはBJT480点以上をお持ちの場合、より高い区分で加点できないか確認してください。'],
  verifyUniversity: ['系统里没有搜索到您的学校，请用毕业证书上的官方英文校名再搜一次；如果最终还是没有匹配上，这次就没办法加院校分了。', '該当する学校が見つかりませんでした。卒業証明書に記載された正式な英語表記でもう一度検索してください。それでも一致しない場合、今回は大学の加点対象になりません。'],
  experience3: ['相关工作经验只要能证明达到3年，就能开始拿到职历加分，可以留意一下年限是否已经足够。', '関連する実務経験が3年に達すると、職歴の加点が始まります。年数が足りているか確認してみてください。'],
  income400: ['如果您不到30岁，并且年收入能达到400万日元以上，这一项就能多加10分。', '30歳未満で年収400万円以上であれば、この項目でさらに10点加算されます。'],
  multipleDegrees: ['如果您有两个不同专业领域的硕士、博士或专业职学位，可以确认一下是否符合额外加5分的条件。', '分野の異なる修士・博士・専門職学位を2つ以上お持ちの場合、追加で5点加点できるか確認してみてください。'],
  educationReview: ['您目前学历选的是“其他或不确定”，这样是不计学历分的。请拿出毕业证和学位证书核对一下，再重新选择对应的学历。', '現在、学歴は「その他・不明」になっており、学歴の点数は加算されていません。卒業証明書・学位記をご確認のうえ、該当する学歴を選び直してください。'],
  activityReview: ['在看积分之前，请先确认您准备从事的工作内容确实符合所选的活动类型，光靠分数达标是不够的。', '点数を確認する前に、まずご予定の業務内容が選んだ活動類型に本当に当てはまるか確認してください。点数が足りていても、それだけでは不十分です。'],
  gapTo80: ['继续核对距离80分的差额，以及还有哪些可以证明的加分项目。', '80点までの差と、証明可能な加点項目を引き続き確認してください。'],
  qualificationReview: ['可以看看您从事的工作是否需要用到日本的国家资格证书，如果有相关的记得补充上。', 'ご担当予定の業務に日本の国家資格が必要かどうか確認してみてください。関連する資格があれば追加できます。'],
  researchEvidence: ['研究成果已经算进总分了，正式申请时记得准备好专利证书、科研经费的批准文件或论文检索记录等证明材料。', '研究実績はすでに合計点に反映されています。申請時には特許証明、研究費採択通知、論文検索結果などの資料を準備しておきましょう。'],
  japaneseDegreeN2Exclusion: ['日语N2和"在日本获得学位"这两项不能同时加分，系统已经按对您更有利的N2来计算了。', 'JLPT N2と「日本での学位取得」は同時に加点できないため、より有利なN2の方で計算しています。'],
  japaneseDegreeSelection: ['如果您确实是在日本的高等教育机构取得学位的，可以勾选该独立加分项目。', '日本の高等教育機関で学位を取得した場合は、この独立項目として選択できます。'],
}
function itemLabel(key: string) { return itemLabels[key]?.[zh ? 0 : 1] ?? key }
function suggestionLabel(key: string) { return suggestionLabels[key]?.[zh ? 0 : 1] ?? key }
function statusLabel(status: string) {
  if (status === 'included') return zh ? '已计入' : '算入済み'
  if (status === 'excluded') return zh ? '因排除关系未计入' : '重複不可のため未加点'
  if (status === 'not-applicable') return zh ? '不适用' : '対象外'
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
        <div><span>{{ zh ? '电话' : '電話' }}</span><strong>{{ report.applicant.maskedPhone || (zh ? '未填写' : '未記入') }}</strong></div>
        <div><span>{{ zh ? '出生日期 / 年龄' : '生年月日 / 年齢' }}</span><strong>{{ formatDate(report.applicant.birthDate) }} / {{ report.applicant.age }}</strong></div>
        <div><span>{{ zh ? '诊断基准日' : '診断基準日' }}</span><strong>{{ formatDate(report.diagnosis.diagnosisDate) }}</strong></div>
        <div><span>{{ zh ? '活动类型' : '活動類型' }}</span><strong>{{ activityLabel(report.diagnosis.activity) }}</strong></div>
        <div><span>{{ zh ? '预计年收入' : '予定年収' }}</span><strong>{{ formatIncome(report.diagnosis.inputSnapshot.annualIncome) }}</strong></div>
      </div>
      <ScoreProgressChart :total="report.scoreChart.totalPoints" :locale="report.locale" />
      <div class="report-status-grid">
        <span>{{ zh ? '预计总分' : '予想ポイント' }}<strong>{{ report.result.totalPoints }}{{ zh ? '分' : '点' }}</strong></span>
        <span>{{ zh ? '70分状态' : '70点状態' }}<strong>{{ report.result.reaches70 ? (zh ? '已达到' : '到達') : (zh ? `还差${report.result.pointsTo70}分` : `あと${report.result.pointsTo70}点`) }}</strong></span>
        <span>{{ zh ? '80分状态' : '80点状態' }}<strong>{{ report.result.reaches80 ? (zh ? '已达到' : '到達') : (zh ? `还差${report.result.pointsTo80}分` : `あと${report.result.pointsTo80}点`) }}</strong></span>
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
