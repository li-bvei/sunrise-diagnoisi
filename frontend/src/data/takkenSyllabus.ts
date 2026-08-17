import type { TakkenCategory } from '@/utils/takkenCategories'

export interface TakkenSyllabusItem {
  label: string
  keywords: string[]
}

// 参考清单：按主流宅建教材目录整理的常见考点，不是官方数字，仅用于估算"知识点覆盖广度"。
export const TAKKEN_SYLLABUS: Record<Exclude<TakkenCategory, '其他'>, TakkenSyllabusItem[]> = {
  '权利关系': [
    { label: '制限行为能力者', keywords: ['制限行为能力者'] },
    { label: '意思表示', keywords: ['意思表示', '心裡留保', '虚偽表示', '错误', '诈欺', '胁迫'] },
    { label: '代理', keywords: ['代理'] },
    { label: '时效', keywords: ['时效'] },
    { label: '物权变动与对抗要件', keywords: ['物权变动', '对抗要件'] },
    { label: '共有', keywords: ['共有'] },
    { label: '抵当权・根抵当权', keywords: ['抵当权', '根抵当权'] },
    { label: '保证・连带保证', keywords: ['保证'] },
    { label: '连带债务', keywords: ['连带债务'] },
    { label: '债权让渡', keywords: ['债权让渡', '债权总则', '将来债权'] },
    { label: '债务不履行・契约解除', keywords: ['债务不履行', '契约解除'] },
    { label: '契约总论', keywords: ['契约总论', '同时履行'] },
    { label: '売买（契约不适合责任）', keywords: ['売买', '契约不适合责任'] },
    { label: '赁贷借契约', keywords: ['赁贷借契约', '赁贷借/使用贷借', '转租', '适法转贷'] },
    { label: '使用贷借契约', keywords: ['使用贷借'] },
    { label: '借地借家法（借地）', keywords: ['借地借家法', '借地权', '定期借地', '代诺许可'] },
    { label: '借地借家法（借家/建物）', keywords: ['借地借家法（建物）', '定期建物赁贷借', '借家', '普通建物赁贷借'] },
    { label: '相续', keywords: ['法定相续', '相续', '继承'] },
    { label: '请负契约', keywords: ['请负契约'] },
    { label: '不当得利・事务管理・不法行为', keywords: ['不当得利', '事务管理', '不法行为'] },
    { label: '区分所有法', keywords: ['区分所有法'] },
    { label: '不动产登记法', keywords: ['不动产登记法', '表示登记', '权利登记'] },
  ],
  '法令上的限制': [
    { label: '国土利用计画法', keywords: ['国土利用计画法'] },
    { label: '都市计画法（区域区分・用途地域）', keywords: ['都市计画法'] },
    { label: '都市计画法（开发许可）', keywords: ['开发许可'] },
    { label: '建筑基准法（用途・建蔽率・容积率）', keywords: ['建筑基准法'] },
    { label: '建筑基准法（防火・道路制限）', keywords: ['防火', '道路制限'] },
    { label: '农地法', keywords: ['农地法'] },
    { label: '土地区画整理法', keywords: ['土地区画整理法'] },
    { label: '盛土规制法', keywords: ['盛土规制法'] },
  ],
  '税に関する法令': [
    { label: '不动产取得税', keywords: ['不动产取得税'] },
    { label: '固定资产税', keywords: ['固定资产税'] },
    { label: '印纸税', keywords: ['印纸税'] },
    { label: '登録免许税', keywords: ['登録免许税'] },
    { label: '所得税（讓渡所得）', keywords: ['讓渡所得', '所得税'] },
    { label: '不动产鑑定评价基准・地价公示法', keywords: ['价格评定', '不动产鑑定评价基准', '地价公示法'] },
  ],
  '宅地建物取引业法等': [
    { label: '宅建业的定义与免许', keywords: ['免许', '宅建业的定义'] },
    { label: '宅建士登録・证明书', keywords: ['宅建士登録', '证明书'] },
    { label: '营业保证金', keywords: ['营业保证金'] },
    { label: '保证协会', keywords: ['保证协会'] },
    { label: '媒介契约', keywords: ['媒介契约'] },
    { label: '35条书面', keywords: ['35条书面', '重要事项说明'] },
    { label: '37条书面', keywords: ['37条书面'] },
    { label: '8种限制', keywords: ['8种限制', 'クーリングオフ'] },
    { label: '手付金等保全措置', keywords: ['手付金等保全措置'] },
    { label: '报酬额の制限', keywords: ['报酬关连', '报酬额'] },
    { label: '自ら売主制限', keywords: ['自ら売主'] },
    { label: '广告规制', keywords: ['广告规制', '誇大广告'] },
    { label: '监督处分与罚则', keywords: ['监督处分', '罚则'] },
    { label: '住宅瑕疵担保履行法', keywords: ['住宅瑕疵担保履行法'] },
    { label: '案内所等の届出', keywords: ['案内所'] },
    { label: '从业者名簿・标识', keywords: ['从业者名簿', '标识'] },
  ],
  '5问免除科目': [
    { label: '住宅金融支援机构法', keywords: ['住宅金融支援机构'] },
    { label: '景品表示法', keywords: ['景品表示法', '公正竞争规约'] },
    { label: '统计', keywords: ['统计'] },
    { label: '土地', keywords: ['土地'] },
    { label: '建物', keywords: ['建物'] },
  ],
}
