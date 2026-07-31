# 开发设计原则

## 最终目标

- 提供 9 个专业诊断工具的独立客户前台。
- 所有正式诊断统一收集姓名和电话号码。
- 出生日期不是全局必填项，只在高度人才、永住、工资、年金等确实需要时显示。
- 买房、租房、卖房等不需要生日的工具不得强制收集生日。
- 不统一收集邮箱、LINE、微信或地址。
- 所有个人信息字段必须与当前诊断有明确关系。
- 正式提交前提供个人信息使用说明和同意确认。
- 后续保存客户资料和诊断记录，增加 Django REST Framework 与 MySQL。
- 未来可增加简单数据查看和使用量统计，但不接入原行政书士 ERP。
- 只继承原 ERP 专业、克制、清晰的视觉语言，不继承页面结构与管理逻辑。

## 建议开发顺序

1. 第一版主页和设计语言
2. 公共分步表单框架
3. 客户姓名和电话收集
4. 诊断记录数据结构
5. 租房初期费用（已完成首个可用版本，不收集姓名电话，见下方维护说明）
6. 买房费用与手续
7. 公司设立费用
8. 高度人才积分（已完成首个可用版本）
9. 永住条件诊断（与高度人才完全独立）
10. 工资、奖金和公司成本
11. 卖房费用与税金
12. 经营管理准备度
13. 离日与年金
14. 数据统计和管理功能
15. 全站测试和上线优化

## 表单与数据边界

公共表单框架应区分全局身份字段、工具专属字段和动态条件字段。姓名与电话为正式诊断共同字段；生日、收入、学历、工作经历等由工具配置决定。前端校验仅用于改善填写体验，最终数据验证与规则计算必须由后端完成。

诊断记录应保存规则版本、输入快照、结果快照、语言、创建时间和同意记录，以便制度变更后仍能解释历史结果。敏感字段应按最小权限访问，并制定明确保存期限与删除机制。

## 后端扩展

建议后续新增：

```text
backend/
├─ config/
├─ apps/
│  ├─ customers/
│  ├─ diagnoses/
│  └─ tools/
├─ requirements/
└─ manage.py
```

前端通过 `VITE_API_BASE_URL=/api` 调用 Django REST Framework；开发、测试和生产环境分别配置，不在源代码写死域名或 IP。MySQL 仅在实际需要持久化数据时加入 Compose。第一版不启动空 Django 或空 MySQL 服务。

## 已上线计算规则的维护

高度人才积分规则集中在 `frontend/src/utils/highlySkilledCalculator.ts`，不得将分数散写到页面组件。每次日本制度或官方加分名单更新时：

1. 核对出入国在留管理厅的积分表、Q&A 与相关告示；
2. 更新 `HIGHLY_SKILLED_RULES_VERSION`；
3. 校验 1号イ、ロ、ハ的学历、职历、年收、年龄与特殊项目；
4. 使用边界值验证确定分与最高可能分的 69/70/79/80 分，以及年收 300 万日元；
5. 同步更新中日文说明与 README；
6. 永住条件维护独立路由、独立数据模型及独立结果说明；J-Skip 见下条，不再要求独立路由。

## J-Skip 与院校名单维护

J-Skip 判断已合并进高度人才积分计算页面（`frontend/src/views/HighlySkilledView.vue`），复用同一表单已收集的活动类型、学历、职历、年收入和基础活动确认，不再单独收集一次。`/tools/j-skip` 路由仅保留为跳转到 `/tools/highly-skilled` 的兼容重定向。J-Skip 的判断结果必须作为结果页里独立展示的区块（不可与上方积分明细混排），不得并入积分合计，也不得使用 70/80 分门槛描述。规则集中在
`frontend/src/utils/jSkipCalculator.ts`，更新时以出入国在留管理厅 J-Skip 页面为准；`calculateJSkip` 的 `annualIncome` 参数单位是万日元，调用前需将高度人才表单里以日元整数保存的 `annualIncome` 除以 10000 再传入。

大学加分数据集中在 `frontend/src/data/universities/`。其中 `officialUniversities.ts`
由项目根目录 `001335478.pdf` 的全部19页表格机械生成，共390所学校、37个国家或地区，
每条记录保留原PDF页码、名单生效年月和核对日期。
名称检索只能返回已维护的官方记录；用户自由输入、无匹配或“其他/不确定”学历均不得自动加分。
入管厅提示申请时仍需确认最新三项世界大学排名，因此无匹配应保留人工确认路径。

更新名单时，在项目根目录运行：

```powershell
python scripts/extract_official_universities.py
```

提取脚本自动识别根目录 `001335478*`，检查全部页面、记录总数、国家映射、规范化校名重复和稳定ID唯一性；任一不符合预期即停止生成，并把统计、异常行及重复行写入
`scripts/output/university-import-review.json`。使用 `--check` 可在 CI 中验证提交数据与本地 PDF 一致。
`universityAliases.ts` 保存 75 所已确认或具有稳定通行用法的中文名称和常用简称；`machineTranslatedNames.ts` 保存其余 315 所机器译名。两层都只改善显示和检索，不产生新学校记录，也不能绕过官方 ID 选择。PDF 导入脚本只能更新 `officialUniversities.ts`，不得覆盖任何中文名称层。

机器译名状态固定为 `machine-translated`。后续人工核对学校官网、政府或教育机构资料后，应把该学校按稳定 ID 迁入 `universityAliases.ts`，将状态改为 `verified`（官方确认）或 `common-name`（稳定通行名称），并从 `machineTranslatedNames.ts` 删除同一 ID。不得修改 `officialName`，也不得按相同中文名合并不同 ID。

搜索使用 NFKC、大小写、空格和标点规范化，并受控处理 `&/and`、前导 `The` 与维护过的简繁体别名；不得加入编辑距离等过度模糊匹配。界面最多显示 20 条，用户必须选择一条正式记录。未匹配只表示当前数据未找到，不等于不符合，也不得计分。

## 确定分与待确认分

基础学历、职历、年收入、年龄、日语和已选中的官方大学记录可以进入确定分。研究成果、日本国家资格、多个领域学位、日本学位、创新机构、中小企业追加、成长领域、地方政府支援、指定外国资格等需要材料或个案判断的项目只进入待确认分。最高可能分等于确定分与待确认分之和；报告继续保存三者、70/80 分状态、学校核对状态和源文件/页码。

官方链接统一维护在 `frontend/src/data/officialSources.ts`。更新规则时须逐个打开核对当前可访问性、标题与项目对应关系；页面组件不得另行硬编码同一制度链接。

日期选择器由 `App.vue` 的 Element Plus Config Provider 跟随 Pinia 语言状态，显示 `YYYY/MM/DD`、内部保存 `YYYY-MM-DD`，切换语言不得清空值。中文和日文 locale 都显式覆盖月份为 `1月` 至 `12月`，不得恢复“一月/十二月”或英文月份。

年收入页面边界使用“万日元/万円”，普通文本数字框允许一位小数；`parseIncomeManYenInput` 在进入计算层前乘以 10,000，`HighlySkilledInput.annualIncome`、积分档位与最低年收检查始终使用日元整数。结果和报告再除以 10,000 显示。清空值保持 `null`，不得使用带上下调节按钮的数字组件。相关职历仍按可证明的完整年数输入。

## 日本大学学位与报告快照

日本高等教育机构学位是 `HighlySkilledInput.japaneseUniversity` 独立用户输入。页面必须保留清晰的手动勾选与补充说明，不得根据学校 ID、国家代码、学校切换或学历自动勾选或取消；院校查询只负责官方大学名单加分。原学位授予确认字段及相关 watch、类型、报告字段和文案不得恢复。

根据入管厅高度人才积分制度 Q&A，N2/BJT 400 档与日本大学学位不重复计分；N1/BJT 480 档不属于该项排除。排除项目保留在明细中并标记为 `excluded`，便于结果页和报告解释。

报告必须由 `createDiagnosisReport(input, result, locale)` 使用当前 `HighlySkilledResult`
快照生成，不得再次计算积分。结果页和报告共同使用 `ScoreProgressChart`、
`ScoreBreakdownChart`、`result.items` 与 `result.suggestions`。报告不再包含或显示官方依据集合、证明项目集合、人工确认集合；积分明细对象和所有尺寸的界面只保留项目键、类别、分数和状态。

姓名、电话、出生日期和报告预览只存在当前 Vue 页面状态，不得写入 localStorage、
sessionStorage、URL、控制台或 API。语言偏好仍可按原设计使用 localStorage。

## 永住申请条件诊断维护

规则集中在 `frontend/src/utils/permanentResidenceCalculator.ts`，规则版本为 `PERMANENT_RESIDENCE_RULES_VERSION`，依据出入国在留管理厅《永住许可に関するガイドライン》（当前为令和8年2月24日改订版，见 `officialSources.permanentResidenceGuideline`）。制度或指南更新时：

1. 核对指南原文与 `officialSources.permanentResidence*` 系列链接的可访问性；
2. 更新 `PERMANENT_RESIDENCE_RULES_VERSION`；
3. 校验6条路径（一般/配偶者/实子/定住者/高度人才/J-Skip）的年限门槛常量（`GENERAL_TOTAL_YEARS` 等）；
4. 使用边界值验证各路径年限门槛的临界情况（如9/10年、69/70分、79/80分）；
5. 同步更新中日文说明与 README「永住申请条件计算规则」章节。

本工具与高度人才积分计算、J-Skip 判断保持独立数据模型：不读取、不复用高度人才积分计算的表单状态，用户需在本工具内自行申报所处积分区间与对应年限。素行善良与独立生计要件仅在 `route` 为 `spouse`/`child` 时按法条免除（`ResidenceRequirementItem.waived`），其余4条路径与所有路径共通的公共义务、无罚金/拘禁刑、现有最长在留期间等 `国益要件` 子项不得因路径不同而省略。

## 租房初期费用诊断维护

本工具是给 SUNRISE 工作人员用的清单/报告生成工具，不是客户自助诊断：房源的实际收费只有经手的工作人员知道，客户没法自己填，因此设计上就是“工作人员逐项勾选+填金额，生成一份给客户看的 PDF”，与高度人才、永住那种自助计算工具是不同类别，不要往自助诊断的方向改。规则/文案集中在 `frontend/src/utils/rentalCostCalculator.ts`（`ITEM_TEXT`/`MATERIAL_TEXT`），类型在 `frontend/src/types/rentalCost.ts`，报告展示在 `frontend/src/components/rental-cost/RentalCostReportView.vue`，详见 README「租房初期费用清单规则」。维护时需注意：

- 本工具不收集姓名和电话号码，也没有免责声明区块——这是业务明确要求去掉的，不要按其他工具的惯例加回去。
- 所有费用金额都是用户直接输入，没有任何“房租 × 月数”或“房租 × 百分比”之类的公式反推；早前做过一版公式计算（仲介手续费默认1个月+隐藏图标改费率、保证公司50%/100%百分比计算）已经被业务否决重做，不要复用那个思路。
- 唯一带自动计算的是“当月房租”的日割参考值（`suggestCurrentMonthRent`，按当月实际天数折算），且只是摆在旁边的建议数字，必须用户主动点“填入参考值”才会写入输入框，绝不能自动覆盖用户已经手动填写的金额。
- 费用项目和材料清单都是固定预设 + 自由追加两部分；新增/调整预设项目时要同步改类型定义（`RENTAL_COST_ITEM_KEYS`/`RENTAL_MATERIAL_KEYS`）和双语文案，不要只改一边。

## 全站使用记录（打点不落地）

`frontend/src/utils/analytics.ts` 提供 `trackEvent()`，当前仅在开发环境输出到控制台，不发送、不持久化（“先埋点不落地”）。已在高度人才积分计算、永住申请条件诊断、租房初期费用诊断三个可用工具中，于页面挂载时记录 `tool_view`、诊断完成时记录 `tool_complete`。后续接入后端数据库统计“哪个工具使用最多”时，应直接改造 `trackEvent()` 内部实现指向真实接口，不需要改动各页面的调用点。新增可用工具时应同步接入这两类事件。
