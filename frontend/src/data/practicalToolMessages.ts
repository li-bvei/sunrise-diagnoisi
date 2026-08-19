export const practicalToolMessages = {
  'zh-CN': {
    common: {
      yen: '日元', monthly: '每月', annual: '每年', calculate: '计算结果', input: '输入条件', result: '模拟结果',
      prefecture: '加入健康保险的都道府县', age: '年龄', care: '加入介护保险（通常为40～64岁）', salary: '月薪／月额报酬',
      residentMonthly: '每月住民税（可选）', residentAnnual: '每年住民税（可选）', grade: '等级', standard: '标准报酬月额',
      source: '参数与来源', year: '适用年度', update: '更新日期', empty: '请先输入有效金额。', saveFailed: '本地保存失败，请检查浏览器存储设置。', save: '保存', cancel: '取消',
    },
    payroll: {
      eyebrow: '收入与社会保险', title: '工资手取与公司实际成本', description: '同时查看员工到手金额、社会保险与公司每月实际负担。',
      takeHome: '预计月到手', companyCost: '公司月成本', companyAnnual: '公司年成本', employeeInsurance: '员工社保', employerInsurance: '公司社保',
      incomeTax: '所得税（概算）', residentTax: '住民税（输入值）', gross: '税前月薪', detail: '月度费用明细', healthInsurance: '本人健康保险等', pensionInsurance: '本人厚生年金', employmentInsurance: '本人雇用保险',
    },
    standard: {
      eyebrow: '收入与社会保险', title: '标准报酬月额反查', description: '根据实际月额报酬确认健康保险与厚生年金等级，并查看临界区间。',
      health: '健康保险', pension: '厚生年金', range: '适用报酬区间', previous: '低一级', current: '当前等级', next: '高一级', difference: '员工社保月差额', noGrade: '无相邻等级',
      salaryMode: '按当前工资查询', targetMode: '按目标标准报酬反查', targetStandard: '目标健康保险标准报酬月额', nextStart: '下一等级起点', distance: '距离下一等级', employeeHealth: '本人健康保险等', employeePension: '本人厚生年金', employerTotal: '公司社保负担', nearby: '附近工资的社保变化',
    },
    pension: {
      eyebrow: '年金', title: '日本年金估算与目标反推', description: '用同一组参数估算基础年金与厚生年金，也可由目标月额反推今后的平均标准报酬。',
      estimateTab: '预计可领取金额', targetTab: '按目标金额反推', currentAge: '当前年龄', workUntil: '预计工作至', nationalMonths: '已缴国民年金月数', employeeMonths: '已缴厚生年金月数',
      existingAverage: '过去平均标准报酬', futureAverage: '今后平均标准报酬', targetMonthly: '目标月领取额', totalMonthly: '预计月领取额', totalAnnual: '预计年领取额',
      basic: '老龄基础年金部分', employee: '厚生年金部分', covered: '基础年金计入月数', futureMonths: '未来厚生年金月数', required: '所需未来平均标准报酬', salaryRange: '对应标准报酬区间',
      exceeds: '所需金额超过当前厚生年金标准报酬上限，仅靠提高月薪可能无法达到目标。', noMonths: '没有未来参保月数，无法反推。', gap: '目标月额差额', increase: '剩余期间需增加的厚生年金年额', plans: '今后平均标准报酬方案对比', note: '本工具为基于现行公开计算方式的简易模拟，并非日本年金机构正式试算。',
    },
    executive: {
      eyebrow: '收入与社会保险', title: '役员报酬模拟器', description: '比较不同役员月额报酬下的个人手取、公司负担与报酬支付后余额。',
      companyProfit: '支付役员报酬前的公司年利润', add: '添加比较方案', personalTakeHome: '个人年手取', companyCost: '公司报酬总成本', remaining: '支付后的公司余额', compensation: '役员月额报酬', annualIncome: '役员年收入', employeeInsurance: '本人社会保险', incomeTax: '所得税参考', residentTax: '住民税参考', employerInsurance: '公司社会保险',
      note: '役员原则上不计雇用保险；法人税、消费税及其他个人控除未纳入本简易模拟。',
    },
    stay: {
      eyebrow: '在日记录', title: '在日天数与出入境记录', description: '在浏览器本地记录离境和入境日期，按年度汇总在日天数，并可导出 CSV。',
      add: '新增记录', edit: '编辑', remove: '删除', export: '导出 CSV', exitDate: '离境日', entryDate: '再入境日', exitPort: '离境口岸', entryPort: '入境口岸', note: '备注', days: '境外天数',
      summary: '年度汇总', inJapan: '在日天数', away: '境外天数', trips: '记录数', longest: '最长单次离境', records: '出入境记录', empty: '尚无记录，请添加第一次行程。', invalid: '再入境日不得早于离境日，请检查日期。', saved: '记录已保存。',
      period: '指定期间统计', start: '开始日', end: '结束日', total: '期间总天数', localOnly: '记录仅保存在当前浏览器中，请定期导出 CSV 备份。', sortNewest: '离境日从新到旧', sortOldest: '离境日从旧到新', inJapanInterval: '与上次入境之间在日',
    },
  },
  'ja-JP': {
    common: {
      yen: '円', monthly: '月額', annual: '年額', calculate: '計算結果', input: '入力条件', result: 'シミュレーション結果',
      prefecture: '健康保険の加入都道府県', age: '年齢', care: '介護保険に加入（原則40～64歳）', salary: '月給／月額報酬',
      residentMonthly: '月額住民税（任意）', residentAnnual: '年額住民税（任意）', grade: '等級', standard: '標準報酬月額',
      source: 'パラメータ・出典', year: '適用年度', update: '更新日', empty: '有効な金額を入力してください。', saveFailed: 'ローカル保存に失敗しました。ブラウザの保存設定をご確認ください。', save: '保存', cancel: 'キャンセル',
    },
    payroll: {
      eyebrow: '収入・社会保険', title: '給与手取り・会社実質負担', description: '従業員の手取り、社会保険料、会社の毎月の実質負担を同時に確認します。',
      takeHome: '概算月額手取り', companyCost: '会社の月額負担', companyAnnual: '会社の年額負担', employeeInsurance: '本人社会保険', employerInsurance: '会社社会保険',
      incomeTax: '所得税（概算）', residentTax: '住民税（入力値）', gross: '総支給月額', detail: '月額費用内訳', healthInsurance: '本人健康保険等', pensionInsurance: '本人厚生年金', employmentInsurance: '本人雇用保険',
    },
    standard: {
      eyebrow: '収入・社会保険', title: '標準報酬月額逆引き', description: '実際の月額報酬から健康保険・厚生年金の等級と境界を確認します。',
      health: '健康保険', pension: '厚生年金', range: '報酬月額の範囲', previous: '1等級下', current: '現在の等級', next: '1等級上', difference: '本人社会保険の月額差', noGrade: '隣接等級なし',
      salaryMode: '現在の給与から検索', targetMode: '目標標準報酬から逆引き', targetStandard: '目標健康保険標準報酬月額', nextStart: '次等級の開始額', distance: '次等級まで', employeeHealth: '本人健康保険等', employeePension: '本人厚生年金', employerTotal: '会社社会保険負担', nearby: '近隣給与の社会保険変化',
    },
    pension: {
      eyebrow: '年金', title: '年金見込額・目標逆算', description: '老齢基礎年金と厚生年金を同じ条件で概算し、目標月額から今後必要な平均標準報酬を逆算します。',
      estimateTab: '受給見込額', targetTab: '目標額から逆算', currentAge: '現在年齢', workUntil: '就業予定年齢', nationalMonths: '国民年金納付済月数', employeeMonths: '厚生年金加入済月数',
      existingAverage: '過去の平均標準報酬', futureAverage: '今後の平均標準報酬', targetMonthly: '目標月額', totalMonthly: '見込月額', totalAnnual: '見込年額',
      basic: '老齢基礎年金部分', employee: '厚生年金部分', covered: '基礎年金算入月数', futureMonths: '今後の厚生年金月数', required: '必要な今後の平均標準報酬', salaryRange: '対応する標準報酬範囲',
      exceeds: '必要額が現在の厚生年金標準報酬月額の上限を超えるため、月給の引上げだけでは目標に届かない可能性があります。', noMonths: '今後の加入月数がないため逆算できません。', gap: '目標月額との差', increase: '残存期間に必要な厚生年金年額増分', plans: '今後の平均標準報酬プラン比較', note: '本ツールは現行の公開計算方法に基づく簡易シミュレーションであり、日本年金機構による正式な試算ではありません。',
    },
    executive: {
      eyebrow: '収入・社会保険', title: '役員報酬シミュレーター', description: '役員報酬月額ごとの個人手取り、会社負担、報酬支払後残額を比較します。',
      companyProfit: '役員報酬支払前の会社年間利益', add: '比較案を追加', personalTakeHome: '個人年間手取り', companyCost: '会社の報酬総負担', remaining: '支払後の会社残額', compensation: '役員報酬月額', annualIncome: '役員年収', employeeInsurance: '本人社会保険', incomeTax: '所得税参考', residentTax: '住民税参考', employerInsurance: '会社社会保険',
      note: '役員は原則として雇用保険の対象外です。法人税、消費税、その他の所得控除は本簡易計算に含みません。',
    },
    stay: {
      eyebrow: '在日記録', title: '在日日数・出入国記録', description: '出国日と再入国日をブラウザ内に保存し、年別の在日日数を集計してCSVに出力できます。',
      add: '記録を追加', edit: '編集', remove: '削除', export: 'CSV出力', exitDate: '出国日', entryDate: '再入国日', exitPort: '出国港', entryPort: '入国港', note: 'メモ', days: '国外日数',
      summary: '年別集計', inJapan: '在日日数', away: '国外日数', trips: '記録数', longest: '最長出国期間', records: '出入国記録', empty: '記録がありません。最初の渡航を追加してください。', invalid: '再入国日は出国日以降にしてください。', saved: '記録を保存しました。',
      period: '指定期間集計', start: '開始日', end: '終了日', total: '期間総日数', localOnly: '記録はこのブラウザ内だけに保存されます。定期的にCSVを出力してバックアップしてください。', sortNewest: '出国日の新しい順', sortOldest: '出国日の古い順', inJapanInterval: '前回入国からの在日',
    },
  },
} as const
