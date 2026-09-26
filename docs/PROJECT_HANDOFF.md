# SUNRISE 项目交接说明

> 文档快照：2026-09-26（Asia/Tokyo）
> 对应代码基线：`origin/main` 的 `323beb9` 及其后的 base 路径修复提交
> 适用对象：接手项目的 AI、前端工程师、产品/业务负责人
> 当前状态：可运行、已上线（Docker + 宿主机 Nginx，`/server/` 子路径）的 Vue 前台工具集合；除宅建题库 API（`server/`，数据存宝塔 MySQL）外，没有其他后端、账号、数据库或案件管理

> 本文档由一次会话对照**当前仓库实际状态**重写（提交历史、路由、测试、构建产物、部署配置、数据量均现场核对，数字见第 9 节）。它是时间点快照，不是永久事实：以后代码和本文档不一致时，以代码、测试和构建产物为准。

## 1. 先看结论

- 前端有 **7 个工具**、**5 个业务分类**：高度人才积分（含 J-Skip）、永住条件、租房初期费用、工资/社保/到手、役员报酬、在日天数记录、宅建刷题。宅建考点速查、薄弱分析是辅助路由，不计入工具数。
- 诊断和计算类工具全部是**前端本地计算**，姓名/电话等只存在当前页面状态。**唯一的后端是宅建题库 API**（`server/`，Node + 宝塔 MySQL，只存宅建错题库和考点，不涉及任何客户数据）。`localStorage` 只存语言偏好、宅建学习记录和出入境记录（见第 8 节）。
- 界面已统一为 **Apple 风格设计系统**；工资和役员报酬的明细是**日本工资单（給与明細）表格**，役员报酬的月額/年額表各有独立的 **PDF 和 CSV 下载**。
- 代码已通过：`vue-tsc`、**53 项自动化测试**、生产构建（2026-09-27 实测）。没有端到端、真机移动端、打印/PDF 的自动化测试。
- **构建路径已修复（2026-09-26）**：`VITE_BASE_PATH` 现在真正生效，**不设置时默认 `/server/`**（与线上一致），所以部署命令和服务器配置都不用动；要换根路径只需在服务器 `.env` 写 `VITE_BASE_PATH=/`（第 10.2 节）。
- 服务器更新流程是：**合并到 `main` → 服务器执行 `bash scripts/deploy.sh` → 浏览器强制刷新**。只推分支不会被部署（第 10、11 节）。
- 法律页（隐私/条款/免责）仍是占位；咨询留资流程只有方案、没有实现（第 14 节）。

## 2. 已经定下的产品决定（不要擅自推翻）

这些都是业主明确要求或确认过的，接手时当作约束：

| 决定 | 时间 | 说明 / 原因 |
| --- | --- | --- |
| 财务工具从 4 个合并为 2 个：工资、役员报酬 | 2026-09-09 | 原“标准报酬反查”并入工资页（社保等级面板），避免重复入口 |
| **年金估算工具整体下线**，`/tools/pension` 重定向到 `/tools` | 2026-09-09 | 旧模型只有单一系数、无再评价率，结果看似权威实则不可靠；重做必须基于完整的再评价率和个人履历 |
| 役员报酬**不含公司利润、法人税、多方案对比** | 2026-09-20 | 业主明确要求；只输入年工资，折算月工资，给出月度/年度支付明细。相关代码已彻底删除，不是隐藏 |
| 役员报酬的“年度总费用”可选择**计入公司负担的社保** | 2026-09-20 | 老板自己是公司出资人，公司那一半社保也是自己出的钱；默认只算本人部分 |
| 健康保险与厚生年金**分开显示**，不再合并成一行“社保” | 2026-09-20 | 业主追问是否合并后改为拆分 |
| 工资、役员报酬的金额输入统一为**万円**（一位小数） | 2026-09-20 | 与高度人才年收入输入同一套 `parseIncomeManYenInput` |
| 明细用**给与明细书样式的支給／控除表格**，不用卡片列表 | 2026-09-20 | 业主要求“日本工资单形式、表格样式” |
| **去掉高度人才、租房两份在线报告的打印 / 另存 PDF**及整套打印代码 | 2026-09-20 | 业主要求；报告只保留在线预览 |
| 输入框/下拉框的聚焦圈用**真实 `border`**，不用 `box-shadow` 环 | 2026-09-20 | 业主反馈阴影“超出选择框”；边框不可能画出圆角之外 |
| 页面级 Cmd/Ctrl+P 使用一份**精简打印样式**（不属于上一条被删的报告打印机制） | 2026-09-26 | 业主反馈打印时页首页尾错位（第 5.5 节） |
| **工资、役员报酬页与 PDF/打印件去掉全部说明和免责声明**；打印压成一页、条件缩略为 1～2 行；下载文件名改为 `役员报酬_每月支付明细_600万円_日期` 形式 | 2026-09-26 | 业主：这是打印给客户的；“过于 AI 的免责声明”不要（第 5.4、5.5 节） |
| 构建路径 `VITE_BASE_PATH` **默认必须保持 `/server/`** | 2026-09-26 | 业主让我按“上线部署方便”自行判断：修复让变量生效，但默认值不变，保证服务器无需改动、下一次部署不会白屏 |

## 3. 技术架构

### 3.1 技术栈

- Vue 3、Composition API、TypeScript strict
- Vite 5、Vue Router history、Pinia
- Element Plus 与 Element Plus Icons
- `html2canvas` + `jspdf`：仅用于役员报酬 PDF，**点击时才动态加载**，不进主包
- Axios 仅作预留依赖；宅建页面用原生 `fetch` 从 `/api/takken/...` 加载题库（`utils/takkenData.ts`，由路由守卫在进入宅建路由前 await）
- Nginx 静态托管、Docker 多阶段构建；`server/` 是宅建题库 API（Node 22 + `mysql2`，独立容器 `takken-api`，经 unix socket 连宝塔 MySQL）
- 测试：Node test runner + esbuild 打包 + `vue-tsc`

### 3.2 目录职责

```text
frontend/src/
├─ components/  公共组件、报告、题库组件、practical（指标卡/打印页头）
├─ data/        双语文案、工具元数据、题库、院校名单、财务参数、官方来源
├─ layouts/     公共前台布局
├─ router/      路由和页面标题
├─ stores/      Pinia 设置状态（目前主要是语言）
├─ styles/      全局主题（Apple 风格）、组件样式、响应式与打印规则
├─ types/       领域类型
├─ utils/       计算规则、CSV/PDF 导出、数据解析、本地存储、打点
└─ views/       页面级工具和静态页面
```

项目主体是前端本地计算，没有服务端领域层。入管、税务、社保规则直接存在 `utils/` 与 `data/` 中。`server/` 只负责宅建题库/考点的读写（`index.mjs` 接口、`db.mjs` 存取、`validate.mjs` 校验、`schema.mjs` 表定义、`make-seed.mjs` 生成种子 SQL、`seed/takken-seed.sql` 种子文件）。

### 3.3 设计系统要点（改样式前必读）

- 全站样式集中在 `frontend/src/styles/index.css`，靠 CSS 变量（`--color-*`、`--radius-*`、`--shadow-*`）驱动；保留原有 class 名，所有页面自动继承。Element Plus 通过 `--el-*` 变量与少量覆盖规则对齐。
- **输入/下拉框**：`.el-input__wrapper / .el-select__wrapper / .el-textarea__inner` 用 `1px solid` 边框 + `overflow: hidden`，聚焦只改 `border-color`；不要改回 `box-shadow` 环。
- **下拉面板**：白底、边框、阴影都画在外层 `.el-popper` 上，它的圆角必须与内层一致（现为 `.el-popper { border-radius: var(--radius-sm) }`）。Element Plus 默认 4px，而内层跟随我们的 10px，两者不一致会让阴影在圆角处“漏”出白底。
- **下拉面板的宽度**：Element Plus 的所有弹层外层都带 `role="tooltip"`，且 select 的内层白框 `min-width` 等于选择框宽度。所以**不能**给全部 `.el-popper[role="tooltip"]` 设 `max-width: 420px`——窗口够宽、选择框超过 420px 时，内层就会比外层宽出一截，选中项的高亮条和滚动条区域伸到白底和阴影外面（2026-09-26 业主反馈“加入都道府県的背景和阴影有偏差”，就是它；此前只修了圆角）。现在只有 `.el-popper.is-dark[role="tooltip"]`（文字提示）限 420px。验证要在**宽窗口（≥1024px，选择框 >420px）**下打开下拉框，比较外层与内层的 `getBoundingClientRect()`。
- Element Plus 的弹层（select、date-picker、tooltip）**被传送到 `<body>`，不在 `#app` 内**；调试时对 `#app` 做 `transform` 不会影响它们。
- `frontend/tests/*.test.mjs` 会对 `index.css` 做**源码断言**（例如不得出现 `report-print-compact`；聚焦规则不得含 `box-shadow`、`.el-popper` 圆角规则必须存在、弹层不得被全局限宽 420px——见 `practical-tools.test.mjs` 的“select / picker panels…”）。改样式时先看这些断言，别为了过测试而删测试。

## 4. 路由和功能清单

| 路由 | 用途 | 状态 |
| --- | --- | --- |
| `/` | 首页：事项选择 → 常用工具 | 已实现 |
| `/tools` | 全部工具，可按分类筛选 | 已实现 |
| `/tools/highly-skilled` | 高度人才积分 + J-Skip 基础判断，在线报告预览 | 已实现（不再有打印） |
| `/tools/permanent-residence` | 永住条件机械判断，6 条路径 | 已实现 |
| `/tools/rental-cost` | 租房费用/材料清单，在线报告预览 | 已实现，**偏工作人员使用** |
| `/tools/salary` | 工资、社保、到手、公司成本、社保等级 | 已实现，简化模型；明细为工资单表格，**暂无下载** |
| `/tools/executive-compensation` | 役员报酬：年工资 → 月工资 + 月額/年額工资单 + 年度总费用 | 已实现，简化模型；每张表可下载 PDF/CSV |
| `/tools/stay-days` | 出入境记录与在日天数 | 已实现，本地保存 |
| `/tools/takken` | 宅建刷题（错题库） | 已实现，本地学习记录 |
| `/tools/takken-notes` | 宅建考点速查；`?sprint=1` 为“考前冲刺专项” | 已实现 |
| `/tools/takken-analysis` | 宅建薄弱分析，支持 CSV | 已实现 |
| `/tools/highly-skilled-pr` `/tools/j-skip` | 旧地址 | 重定向到高度人才 |
| `/tools/payroll` `/tools/standard-remuneration` | 旧地址 | 重定向到 `/tools/salary` |
| `/tools/pension` | 已下线 | 重定向到 `/tools` |
| `/guide` | 使用说明 | 已实现 |
| `/privacy` `/terms` `/disclaimer` | 法律页 | **占位内容** |
| 其他 | 404 | 已实现 |

说明：

- **“考前冲刺”不是独立路由**，而是考点速查页里的开关，靠 `TakkenTopic.examSprint` 标记（当前 6 个考点），开关状态同步到 `?sprint=1`。
- 工具元数据在 `frontend/src/data/tools.ts`；J-Skip 已并入高度人才页，不要重新当作独立工具；分类数量运行时计算，新增工具不要手写 count；高度人才、永住、租房标记为 `featured`，首页只展示这三个。

## 5. 财务工具（工资 / 役员报酬）

这是最近改动最多的部分。计算集中在 `frontend/src/utils/financialCalculator.ts`，参数在 `frontend/src/data/financialParameters.ts`（`applicableYear: 2026`，`updatedAt: 2026-09-20`，来源链接 7 条，含国税庁 No.1180 扶养控除）。**参数由早期会话整理，本次未逐项联网复核。**

### 5.1 计算模型

| 项目 | 做法 |
| --- | --- |
| 社会保险 | 按月额报酬查标准报酬等级（健康 50 级、厚生年金 32 级，下限含、上限不含）；健康保险按 47 都道府县费率取一半；介护（40–64 岁自动勾选）、子育て支援金、厚生年金各取一半；雇用保险仅工资工具计入 |
| 所得税 | 给与所得控除 → 基础控除（按所得分档）→ 社保 → 扶养控除 → 累进税率 + 復興特別所得税 2.1%，百円未満舍去 |
| 住民税 | `(给与所得 − 社保 − 43万 − 33万×扶养人数) × 10% + 均等割 5,000`；同水准年收持续的概算，可手动改写（“调整 / 恢复概算”） |
| 扶养控除 | 仅**一般扶养亲属（16 岁以上）**：所得税每人 38 万、住民税每人 33 万；人数 0–10 |
| 手当（仅工资页，2026-09-26） | 基本给以万円输入，**手当以円输入**（通勤费如 12,340 円，万円一位小数太粗）。三类，处理不同：①**通勤手当**（电车/巴士等）每月 15 万円以内**不课税**，超出部分课税，但**全额计入**社保标准报酬和雇用保险；②**课税手当**（残业/职务/住宅/家属等）课税，计入社保/雇用保险；③**其他非课税手当**（出差费、日当、在宅办公实费报销等实费弁償）**不课税、不计入社保/雇用保险**，但计入总支给/到手/公司成本。`calculatePayroll` 返回 `grossMonthly`（总支给）、`insuranceBase`（社保基数，决定等级）、`taxableMonthly`、`commutingNonTaxable/Taxable`。15 万円限额在 `ALLOWANCE_PARAMETERS`（所得税法施行令第 20 条の 2）；**自家用车/自行车通勤的距离别限额更低，未实现**，不要把它们的通勤费填进这一栏。役员报酬页没有手当。 |
| 役员报酬 | 与工资同一套个人税/社保算法，但**不计雇用保险**；年工资 → 月工资 = `round(年/12)`；健康保险与厚生年金分开返回 |
| 年度总费用 | 所得税 + 住民税 + 健康保险 + 厚生年金；开关打开时再加公司负担的社保（`employerInsuranceAnnual`） |

`yen()` 在所有输出边界把 NaN/负数收敛为有限的非负整数，输入非法也不会输出 NaN。

### 5.2 已知的模型边界（结果都标“概算”）

- 没有配偶者控除/配偶者特别控除、特定扶养亲属（19–22 岁）、老人扶养亲属（70 岁以上）。
- 住民税没有调整控除、非课税限度额、自治体独自的超过课税。
- 没有其他所得控除（医疗费、生命保险料、iDeCo 等）、税额控除。
- 2025 年度日本税制改正上调了多项门槛，2026 年度具体数字**未对照官方原文核实**。
- 结果不得表述为税务/法律意见。**页面、打印件、PDF 里已按业主要求去掉所有说明文字和免责声明**（2026-09-26）；只在项目名里保留“（概算）”：所得税一直带，住民税在系统估算（未手动调整）时也带。

### 5.3 工资单表格（給与明細）

- 全局样式 `.payslip-table` 在 `index.css`；工资页 1 张（月额），役员报酬页 2 张（月額 / 年額）。
- 左侧“支給項目”（基本给，另加已填写金额的手当行：通勤手当（非课税）、通勤手当（超限课税部分）、课税手当、其他非课税手当），右侧“控除項目”（健康保险、厚生年金、[雇用保险]、所得税、住民税），底部“支給合計 / 控除合计”和高亮的“差引支給額（实际到手）”。控除项不加负号（与真实工资单一致）。
- 手机上表格横向滚动（`min-width: 480px`）。

### 5.4 下载（仅役员报酬页）

- **数据结构**：`PayslipData`（`utils/csv.ts`），页面里 `buildMonthlyPayslip()` / `buildAnnualPayslip()` 各自只读月度/年度字段，CSV 与 PDF 共用；测试断言二者不会混用。
- **CSV**：`payslipToCsv()`，UTF-8 BOM、全部加引号、金额为原始日元整数，版式与屏幕表格一致（支給/控除两栏对齐，后面是合计行和实发行）。
- **PDF**：`utils/payslipPdf.ts`。在 `<body>` 上挂一个离屏的 A4 宽（794px）DOM（`.payslip-pdf-sheet`），复用 `.payslip-table` 样式，`html2canvas` 栅格化后由 `jsPDF` 放入 A4；文件约 160 KB、一页。
  - 用栅格化是有意的：中日文无需内嵌数 MB 的 CJK 字体；**代价是 PDF 内文字不可选中、不可搜索**。
  - 必须 `new jsPDF({ compress: true })`，否则 PNG 以原始像素嵌入，一页会有约 5 MB。
  - 所有文本通过 `textContent` 写入，不解析为 HTML；离屏 DOM 在 `finally` 中一定移除。
  - 两个库用 `import()` 懒加载，各是独立 chunk（jsPDF 约 381 KB、html2canvas 约 197 KB），点击前不下载。
- **PDF 版面**：标题（`役员报酬 · 每月支付明细`，不带“模拟/シミュレーター”）+ 右上角品牌 + 两行条件（年工资、年龄、都道府県、扶养人数、是否含介护；日期）+ 表格。**没有脚注/免责声明**。条件行由页面的 `conditionLines` 生成，PDF 和 Cmd+P 打印页头共用。
- **文件名**（`buildFilename()`，`utils/csv.ts`）：`{报告名}_{表名}_{年工资}万円_{YYYYMMDD}.{pdf|csv}`，跟随界面语言，例如 `役员报酬_每月支付明细_600万円_20260926.pdf`、`役員報酬_月額の支払内訳_600万円_20260926.pdf`；去掉系统不允许的字符和空白。日期用**本地日期**（`utils/dateStamp.ts`，不是 `toISOString()`，后者在日本会差一天）。

### 5.5 页面打印（Cmd/Ctrl+P）

2026-09-26 用无头 Chrome 复现：未加打印样式时会印出网站顶栏和手机菜单按钮（纸宽小于 780px 断点）、把卡片从中间劈开（“每年支付明细”标题留在上一页页底、表格在下一页页首）、多出一页孤零零的页脚（共 4 页）；浏览器自带的日期/网址/页码行还紧贴正文（12mm 边距太小）。

现在 `index.css` 末尾有一份精简的 `@media print`：隐藏 `.site-header / .site-footer / .mobile-panel / .el-message / .no-print`，取消 `.app-shell` 的 flex 与 100vh，`.el-card / .practical-panel / .payslip-wrap / .payslip-table tr` 不允许跨页；`@page { size: A4 portrait; margin: 18mm 12mm }`。下载按钮包在 `.no-print` 里，不会印到纸上。

**工资页、役员报酬页现在打印成一页 A4**（2026-09-26，业主要求“入力条件缩略到一两行，整体控制到一页”）：
- 输入卡片、页头介绍（`PracticalToolHero`）、役员报酬页两张汇总卡（与表里的基本給/差引支給額重复）、年度总费用的开关都加了 `.no-print`；取而代之的是只在纸上显示的 `PrintHeader`（`components/practical/PrintHeader.vue`，`.print-only`）：标题 + 品牌 + 两行条件，版式与 PDF 抬头相同。
- 打印块里把卡片/表格的内边距压小，年度总费用改成两列；纸宽（约 703px）小于 780px 断点，所以移动端的堆叠规则在纸上也生效，需要时要在打印块里撤销（例如工资页三张汇总卡 `.practical-metrics.three`）。
- 无头 Chrome 实测（中/日文 × 默认 / 开启公司负担 + 扶养 3 人 / 工资页勾选介护 + 手动调整住民税）全部 **1 页**，最长的内容约在页高 87% 处（可用区域到约 94%），余量约 7%。**改打印样式或往这两页加内容后必须重测**（见下文验证办法）。

## 6. 其他工具要点

- **高度人才**：`highlySkilledCalculator.ts`（规则版本 `2026-07`），覆盖 1号イ/ロ/ハ、70/80 分、最低年收；J-Skip 在 `jSkipCalculator.ts`，嵌入结果页、不并入积分合计。院校加分只认 390 条官方记录（源自根目录 PDF），中文名分两层（75 条人工、315 条机器译名）。**现状仍在诊断前要求填写姓名（必填）与电话（选填，填则需 7–30 位）**，这是旧交互，目标形态见第 14 节。
- **永住**：`permanentResidenceCalculator.ts`（`2026-07`，依据令和 8 年 2 月 24 日改订指南），6 条路径；与高度人才数据模型相互独立。诊断前同样要姓名/电话。
- **租房**：工作人员按实际收费逐项勾选并填金额，不做倍数/百分比推算；唯一自动量是“当月房租日割参考值”，必须点“填入参考值”才写入。**不要改成客户自助计算**。报告只在线预览。
- **出入境记录**：`localStorage`，年度与指定期间统计；今日日期用本地日期；删除有确认；CSV 导出有成功/失败提示。**没有导入 CSV 和“清空全部数据”入口。**
- **宅建**：错题库与考点速查**存在宝塔 MySQL 里**（表 `takken_questions` / `takken_topics`），前端通过 `/api/takken/...` 读取；增改用 `frontend/scripts/upsert-takken-*.mjs`（调 API，需要 `TAKKEN_API_URL` 和令牌），写入后刷新即生效，**不需要提交或部署**。`frontend/src/data/takken-*.json` 只是导出的备份快照，网站不再读取，**不要手改**。维护流程见 [`TAKKEN_DATA_WORKFLOW.md`](./TAKKEN_DATA_WORKFLOW.md)。

## 7. 主要数据和规则

| 数据/规则 | 位置 | 当前信息 |
| --- | --- | --- |
| 高度人才 / J-Skip / 永住 | `utils/highlySkilledCalculator.ts` `jSkipCalculator.ts` `permanentResidenceCalculator.ts` | 规则版本均为 `2026-07` |
| 租房清单 | `utils/rentalCostCalculator.ts` | 清单版本 `2026-08`，金额由用户输入 |
| 工资/社保/役员报酬 | `utils/financialCalculator.ts` + `data/financialParameters.ts` | 简化估算，见第 5 节 |
| 官方来源 | `data/officialSources.ts` | 集中维护入管厅链接（未在线复核） |
| 院校名单 | `data/universities/officialUniversities.ts` | 390 条、37 个国家/地区，脚本 `scripts/extract_official_universities.py` 生成 |
| 宅建错题 | 宝塔 MySQL `takken_questions`（备份：`data/takken-questions.json`） | 备份快照 156 题，ID 无重复；线上以数据库为准 |
| 宅建考点 | 宝塔 MySQL `takken_topics`（备份：`data/takken-topics.json`） | 备份快照 156 个，其中 `examSprint` 6 个；线上以数据库为准 |
| 宅建种子文件 | `server/seed/takken-seed.sql` | 由 `npm run takken:seed` 从两个 JSON 备份生成；宝塔「导入」即可初始化/恢复数据库，可重复导入 |

题库/考点是法律与考试业务数据，自动测试只验证结构与交互，**不能替代人工核对法条版本和答案**。数量会持续变化，线上数量以数据库为准，需要时调 `GET /api/takken/questions` 现查，不要凭本表假设。

## 8. 浏览器本地存储

| Key | 内容 | 备注 |
| --- | --- | --- |
| `sunrise-diagnosis-locale` | 中日语言偏好 | 非敏感 |
| `sunrise-diagnosis-takken-attempts` | 宅建答题统计、复习记录 | 版本 2，有迁移，历史上限 20 |
| `sunrise-diagnosis-takken-exam-date` | 宅建考试日期 | 仅当前浏览器 |
| `sunrise-diagnosis-takken-upload` | 宅建 CSV 分析结果 | 可能含用户上传的学习记录 |
| `sunrise-diagnosis-takken-favorites` | 宅建收藏 | 仅当前浏览器 |
| `sunrise-diagnosis-stay-records-v1` | 出入境记录 | 有个人信息属性，缺导入/清空入口 |

高度人才、永住、租房页的姓名、电话、出生日期及报告状态只存在页面内存，不写 localStorage、URL、日志或 API。工资、役员报酬的输入、CSV/PDF 下载都不持久化任何内容。

## 9. 当前验证结果

2026-09-27 在工作区实测（宅建题库改为 API + MySQL 之后）：

```bash
cd frontend
npm test          # vue-tsc -b && node --test tests/*.test.mjs
npm run build
```

- `vue-tsc`：通过。
- 自动化测试：**53/53 通过**（`practical-tools` 19、`regression` 11、`takken` 15、`takken-server` 4、`deploy-config` 4）。
- `npm run build`：通过，转换 2,082 个模块；主 JS 约 1,045 KB、CSS 约 419 KB，仍有“chunk 超过 500 kB”警告；题库和考点数据已不再打进前端包（`TakkenTopicsView` 约 6 KB，`takkenQuestionModel` 不再是大 chunk），`HighlySkilledView` 约 231 KB；jsPDF/html2canvas 为独立懒加载 chunk。
- 默认构建的 `dist/index.html` 资源路径为 `/server/assets/...`（`VITE_BASE_PATH` 未设置时的默认值）。
- `git diff --check`、`npm ci --dry-run`（锁文件与 `package.json` 一致，服务器 `npm ci` 依赖它）通过。
- `npm audit --omit=dev`：1 项 high，`nanoid <3.3.18`，来自 `vite → postcss`，属**构建期**依赖，不会打进浏览器代码；未处理。

**宅建题库 API 的验证边界**：用本机临时 MySQL（unix socket、仅 localhost 用户）做过端到端验证——种子 SQL 导入与重复导入、并发计数、导出与 JSON 逐条一致、页面加载与 API 不可用时的提示；**真实服务器上的 `docker compose`、socket 挂载和宝塔权限没有验证过**，首次部署请按 README「题库 API 与数据库」逐步核对。

**验证边界（未覆盖，不能写成已通过）**：没有端到端浏览器测试、真机移动端测试；打印和 PDF 下载只在 2026-09-26 手工验证过（见下），没有自动化；`extract_official_universities.py --check` 需要 `pdfplumber`，本机未装；没有 `shellcheck`；`officialSources.ts` 的外部链接未逐个联网复核。

### 如何验证打印与 PDF（本次用过的办法）

- **打印**：本地起 `vite`，用无头 Chrome 输出 PDF（macOS 路径 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`）：`--headless=new --virtual-time-budget=8000 --run-all-compositor-stages-before-draw --no-pdf-header-footer --print-to-pdf=out.pdf <url>`；去掉 `--no-pdf-header-footer` 可检查浏览器页眉页脚是否压到正文。再用 PyMuPDF（`pip install pymupdf`，建议放临时 venv）逐页渲染成图看，并按 `words` 坐标量页眉/正文/页脚的间距。
- **打印前要改页面状态**（开“计入公司负担”、改扶养人数、勾选介护……）：用 `--remote-debugging-port` 起无头 Chrome，Node 内置 `WebSocket` 调 CDP —— `Runtime.evaluate` 操作页面，再 `Page.printToPDF`。两个坑：**不要**调 `Emulation.setEmulatedMedia`（设成 screen 会输出屏幕样式，页数完全不对）；Element Plus 数字框的加减按钮响应 `mousedown` 而不是 `click`，改数值请对 `<input>` 设值并派发 `input` 事件。
- **PDF 下载**：在页面里包住 `URL.createObjectURL` 截获 Blob 并让 `HTMLAnchorElement.click` 变成空操作，点“下载 PDF”，再把 Blob 用 `fetch` POST 到本地小接收服务，用 PyMuPDF 检查页数、图片尺寸、渲染效果。

## 10. 部署和上线

### 10.1 服务器更新流程

服务器把仓库 clone 在站点目录（示例 `/www/wwwroot/sunrise-diagnoisi`）。宿主机 Nginx（宝塔）把 `/server/` 反向代理到容器 `127.0.0.1:8090`，容器内 Nginx 静态托管 `dist`，容器名 `sunrise-diagnosis-web`，健康检查 `/healthz`，并把 `/api/` 转发给同一 Compose 网络里的题库 API 容器 `sunrise-takken-api`（不对外发布端口，健康检查 `/api/health`）。API 通过挂载宿主机 MySQL 的 unix socket（默认 `/tmp/mysql.sock`，可用 `TAKKEN_DB_SOCKET` 改）连接数据库，所以宝塔里的数据库用户权限选「本地服务器」即可。

**首次部署前**必须在服务器根目录 `.env` 写 `TAKKEN_DB_NAME` / `TAKKEN_DB_USER` / `TAKKEN_DB_PASSWORD`（以及写入用的 `TAKKEN_ADMIN_TOKEN`），并在宝塔里导入种子文件 `server/seed/takken-seed.sql`；详见 README「题库 API 与数据库」。`deploy.sh` 缺少这些配置或找不到 socket 时会在构建前直接报错退出。

```bash
cd /www/wwwroot/sunrise-diagnoisi
bash scripts/deploy.sh              # 默认 origin/main
bash scripts/deploy.sh <分支|标签|提交>
```

`scripts/deploy.sh`：`git fetch --prune` → `git reset --hard <ref>` → 检查 `.env` 数据库配置与 MySQL socket → `docker compose up -d --build --remove-orphans` → `docker image prune -f` → 等待两个容器（`takken-api`、`web`）健康检查 `healthy` → `docker compose ps`。健康检查失败会打印容器日志并以非零码退出。`reset --hard` 会覆盖服务器上已跟踪文件的本地改动，**服务器只作部署目标**；根目录 `.env` 被忽略，不受影响。上次实测构建约 56 秒（含 `npm ci`），新增 PDF 依赖会略增。

要点：

1. **部署读的是 `origin/main`。** 只推分支、不合并 `main`，服务器会“成功部署”旧版本——这在 2026-09-20 真实发生过（日志里 `当前提交` 还是旧提交号）。看日志里的提交号是否等于预期。
2. 静态资源文件名带内容哈希并被 Nginx 长缓存（`immutable`，1 年），`index.html` 是 `no-store`。**部署后在浏览器强制刷新**（Mac：Cmd+Shift+R）或用无痕窗口，否则旧标签页里仍是旧 JS/CSS。
3. AI 会话**没有服务器的 SSH 权限**，无法直接部署，只能给出命令由业主执行。若要“推送后自动上线”，需要另建 CI（如 GitHub Actions + SSH），目前**没有** `.github/`、没有任何 CI。

### 10.2 `base` 路径（已修复，2026-09-26）

**问题**：此前 `frontend/vite.config.ts` 把生产 `base` 写死为 `/server/`，`Dockerfile`/`docker-compose.yml` 传入的 `VITE_BASE_PATH` 完全没被读取，README 却写成“可配置”。线上是子路径部署所以碰巧可用，但根路径部署会白屏，文档也在误导人。

**修复**：
- `frontend/vite.base-path.ts` 的 `resolveBasePath(raw, isProduction)`：变量为空/未设置 → 生产 `/server/`、开发 `/`；有值 → 规范化成 `/segment/` 形式；非法值（不是绝对路径、含 `//` 开头、网址、`..`、空格、`?`）**直接抛错让构建失败**，因为错误的 base 不会报错、只会白屏。
- `vite.config.ts` 用 `loadEnv(mode, process.cwd(), '')` 读取（`process.env`，即 Docker 构建参数/命令行变量，优先于 `.env` 文件）。
- `Dockerfile` 的 `ARG` 默认值和 `docker-compose.yml` 的 `${VITE_BASE_PATH:-/server/}` 都改成 `/server/`，保证“不设变量”在整条链路上都是 `/server/`。若只改 Vite 而保留 compose 的旧默认 `/`，没有 `.env` 的服务器会在下一次部署时静默切成 `/assets/...` 而白屏——这是本次修复刻意规避的坑。
- `createWebHistory(import.meta.env.BASE_URL)` 本来就跟随 Vite `base`，无需改。全仓库没有其他硬编码的 `/server/`。

**验证（2026-09-26）**：
- 不设变量：`dist/index.html` 资源为 `/server/assets/...`，主 JS 哈希 `index-TN1SGNex.js`，与修复前**逐字节一致**（即对线上产物零影响）。
- `VITE_BASE_PATH=/` → `/assets/...`；`=/app` → `/app/assets/...`；`=` 空值 → 同默认；`=https://x.com/a` → 构建失败并给出明确报错。
- 用 `vite preview` 真实运行两种构建：深层链接直接打开可渲染、站内导航前缀正确、懒加载分块（含点击“下载 PDF”才加载的 jsPDF/html2canvas）都从对应前缀返回 200。
- 自动化：`tests/deploy-config.test.mjs` 断言默认值、规范化、非法值报错，以及 vite/Dockerfile/compose 三处默认一致、路由不含硬编码前缀。

**使用方式**：线上不用改任何东西，`bash scripts/deploy.sh` 照旧。要切根路径：服务器项目根目录 `.env` 写 `VITE_BASE_PATH=/`，再部署，并把宿主机 Nginx 的 `location ^~ /server/` 改成 `location /`（参考 README 方式一）。

### 10.3 Nginx

有基础安全响应头、gzip、健康检查、静态资源长缓存和 SPA fallback（`try_files … /index.html`）。仍可考虑 CSP/HSTS（先确认外层代理的责任）、HTML/静态资源缓存策略的真实部署验证，以及根路径/子路径 smoke test。

## 11. Git 与协作工作流

- 仓库 `git@github.com:li-bvei/sunrise-diagnoisi.git`，默认分支 `main`。历史脉络：2026-07-27 诊断前台起步 → 高度人才/永住/J-Skip → 租房报告 → 8 月宅建刷题/速查/分析 → 09-09 Apple 风格重设计 + 财务工具合并 + 部署脚本 → 09-20 工资单表格/扶养控除/阴影修复 → 09-23 宅建数据与考前冲刺 → 09-24/26 役员报酬 CSV/PDF 与打印修复。
- 习惯做法：在特性分支提交并推送，再**快进合并到 `main`** 并推送（`git merge --ff-only`），然后由业主在服务器部署。提交信息为英文摘要 + 中文关键词，末尾带 `Co-Authored-By`。
- 目前远端有 5 个已全部合并进 `main` 的特性分支（`feat/apple-redesign-financial-tools`、`feat/executive-payslip-csv-download`、`feat/payslip-dependents-ui-fixes`、`feat/payslip-pdf-download-print-fix`、`docs/handoff-snapshot-2026-09-16`），可以安全删除。
- 工作区里可能有**别的会话/人留下的未提交改动**：默认不要顺手提交或回退；业主明确说“全部推送”时才一并提交（2026-09-26 就是如此处理的）。提交前用 `git status`/`git diff --stat` 看清范围，并检查有无密钥类内容。
- 与业主确认“上传了吗”这类问题时，**先 `git fetch` 再看 `origin/main` 是否包含目标提交**，不要凭记忆回答。

## 12. 已知缺陷和未完成项

### 高优先级

1. 法律页仍是占位；高度人才/永住在诊断前就要求姓名（必填）与电话（选填）——在正式隐私政策、保存期限、同意机制完成前，不要把任何个人信息持久化或接入后端。
2. 财务结果是前端简化概算，缺配偶者控除、特定/老人扶养等（第 5.2 节），参数未联网复核；正式对客前应由税务专业人员确认，并考虑加规则元数据（版本、适用日、来源、复核状态）。
3. 宅建题库/考点的法条、年份、答案和中日文内容需要业务人员复核。

### 中优先级

1. 主 JS 约 1,045 KB、CSS 约 419 KB；宅建题库随 `takkenQuestionModel` 打进同一 chunk（约 379 KB）。
2. `App.vue` 里的全局 `MutationObserver` 监听整个 `body` 来修正日期弹层标题，维护成本高；`document.title` 由 `PublicLayout.vue` 与 `router/index.ts` 两处设置。
3. 没有端到端、真机移动端、打印/PDF 的自动化回归。
4. 役员报酬 PDF 是栅格化图像，文字不可选中；若业务要求可检索/可复制，需要内嵌 CJK 字体重做。
5. 工资页有工资单表格但**没有** PDF/CSV 下载，与役员报酬页不一致（业主当时只要求了役员报酬页）。
6. 出入境记录没有“导入 CSV”和“清空全部数据”入口。
7. `analytics.ts` 只在开发环境 `console.debug`，且只接了高度人才/永住/租房三个工具，没有真实数据。
8. `nanoid` 建议（构建期）未处理；Python 数据脚本没有声明可复现依赖（缺 `pdfplumber`）；`officialSources.ts` 链接未逐个在线核验。
9. 没有 CI，也没有部署后自动 smoke test。

### 低优先级 / 产品建设

草稿保存与跨设备继续、报告分享、咨询转案件与跟进、材料补充、真实使用量统计、正式后端（Django/MySQL）与权限模型。

## 13. 接手时不要做的事

- 不要恢复高度人才/租房报告的打印按钮或 `report-print-compact` 那套“缩放到一页”的打印机制；页面级打印只保留 `index.css` 末尾那份精简样式。
- 不要把说明段落、信息提示框、免责声明（`FinancialDisclaimer` 已删除）加回工资/役员报酬页、打印件和 PDF；业主 2026-09-26 明确要求去掉。
- 不要给役员报酬重新加公司利润、法人税、多方案对比；不要重做年金估算，除非基于完整的再评价率与个人履历。
- 不要把 `VITE_BASE_PATH` 的默认值改成 `/`：线上是 `/server/`，`vite.base-path.ts`、`frontend/Dockerfile`、`docker-compose.yml` 三处默认必须一致（有测试守着），否则没有 `.env` 的服务器下次部署会白屏（第 10.2 节）。
- 不要把输入框聚焦圈改回 `box-shadow`，不要删掉 `.el-popper` 的圆角规则（第 3.3 节）。
- 不要把 J-Skip 重新加成独立工具；不要把租房工具改成客户自助计算。
- 不要让大学中文译名覆盖官方 PDF 的 `officialName`、稳定 ID 或自动生成文件。
- 不要把前端简化计算结果表述为许可保证、正式税务结论或法律意见。
- 不要在后端和正式隐私政策上线前把姓名、电话、出生日期、诊断结果持久化。
- 不要整份读取宅建两个 JSON；不要在没确认 `origin/main` 的情况下告诉业主“已经上线”。
- 不要直接复制旧 ERP 的客户详情页；应复用其成熟的数据原则，同时避免“页面过长、客户与案件上下文混杂、权限不细”。

## 14. 给 AI 会话的协作约定（从实际协作中总结）

- **默认用中文回复**（日文界面文案、代码注释除外）。
- 业主在意速度，说“尽快 / 速度”时少做发散；但被要求“先回答问题，再处理代码”时，必须先给出文字答案。
- 业主会在服务器和自己的浏览器里验证。遇到“部署后没变化/问题又出现”，先排查**是否合并了 `main`、服务器提交号、浏览器缓存**，再怀疑代码；用本地生产构建（`vite preview`，注意 `/server/` 前缀）复现，别只看开发服务器。
- “上传”指：提交 → 推送特性分支 → 合并到 `main` → 推送 `main`，并给出服务器命令。
- 汇报要**区分已验证与推测**；无法复现的问题要如实说明并请业主提供浏览器/截图，不要编造根因。
- 修改财务/税务相关文案或数字时，保持“概算”口径（作为项目名里的标签），并同步中日双语与测试；面向客户的页面/打印/PDF 不要加回说明段落或免责声明。

## 15. 从提交历史推断的产品意图

1. 核心不是“尽可能多的计算器”，而是可信、可解释、可维护的在日生活与经营辅助入口；规则不可靠的功能宁可下线（年金即是）。
2. 先做前端本地计算和清晰结果，再谈后端；中日双语、移动端、官方来源和风险说明是基础能力。
3. 个人信息按业务最小化采集，不能为了 CRM 方便让所有工具统一索要姓名、生日、电话。
4. 后续方向是“诊断/咨询 → 客户 → 案件 → 材料与跟进”，但与旧行政书士 ERP 解耦，不能把公开前台变成内部后台。
5. 客户页面应服务持续关系和多案件复用；案件页面负责具体业务推进，二者不能合成一张超长表单。

---

## 附录：咨询留资方案（尚未实现）

以下第 A–F 节是此前整理的**产品与技术方案**，代码里没有任何实现（`frontend/src` 中没有 `consultation` 相关代码）。原文保留，仅按现状修正了与打印、当前交互有关的措辞。

### A. 对“客户页面”意图的修正结论

这里的“客户页面”不是要在本项目中重建旧 ERP 的 Customer 360 或案件工作台，而是指**当前面向客户的诊断页面及诊断后的咨询衔接**。依据：

- `README.md` 已写明“结果页后置的可选咨询留资，取代早期表单前置收集姓名电话的设计”。
- `HighlySkilledView.vue` 和 `PermanentResidenceView.vue` 目前仍在诊断前收集姓名（必填）与电话（选填），这是尚未完成的旧交互，不是目标形态。
- 高度人才报告已具备 `reportId`、`generatedAt`、`locale`、规则版本、输入快照和结果快照，无需重做计算或报告模型。
- `analytics.ts` 已有 `tool_view` / `tool_complete` 接口点，后续只需扩展提交咨询事件。
- 项目原则是独立诊断前台、最小化收集个人信息、不接入旧 ERP；租房工具仍保持工作人员清单工具，不强制套用客户留资。

因此应采用成熟 CRM 的 **Web-to-Lead / Webform** 模式：诊断留在当前 Vue 页面中完成；只有用户看完结果、主动请求人工复核并同意数据使用时，才把最小联系信息和诊断摘要送到现成 CRM。

### B. 保留现有代码的页面改法

**B.1 诊断阶段不留资**：高度人才和永住页面保留现有步骤、计算器、规则说明和在线结果/报告预览，只做以下调整：

1. 姓名、电话从诊断必填步骤移出，不再阻挡计算。
2. 诊断所需的出生日期、收入、职历等仍按计算规则保留，但默认只存在当前页面。
3. 结果仍由现有计算器生成，不改积分、永住路径、J-Skip 或报告逻辑。
4. 页面继续明确“输入未发送、未保存”。

**B.2 结果页增加可选咨询卡**，放在结果、建议和免责声明之后，不做全局弹窗骚扰：

```text
需要 SUNRISE 人工复核本次结果？
[提交本次诊断进行咨询]
```

展开后只收集：姓名；一种可联系渠道（电话或邮箱，按业务最终确认）；希望联系的语言/方式；可选咨询说明；个人信息使用说明与明确同意。

系统自动附带、不让客户重复填写：`tool_id`、`report_id`、`rule_version`、`locale`、结果摘要（如 `reaches80` / `reaches70` / `below70`、永住路径及是否初步符合）、提交页面与时间、一次提交对应的 `request_id`。

默认不向外部 CRM 发送完整 `inputSnapshot`，尤其不发送出生日期、详细收入、证件信息或全部勾选内容；需要正式受理时再由工作人员在明确说明用途后补充。

**B.3 提交后的状态**：成功后只显示已收到咨询、咨询编号、预计联系渠道、本次提交了哪些信息、撤回或删除请求的联系方式。失败时保留用户刚填写的咨询字段并允许重试；同一个 `request_id` 重试不得产生重复 Lead。

### C. 现成做法与候选产品

**最贴合：CRM Webform / Web-to-Lead**——成熟 CRM 已提供的标准入口，不需要本项目先开发客户列表、案件状态机、时间线和任务系统。

```text
当前 Vue 诊断结果
  → 用户主动展开咨询表单并同意
  → Webform / Lead Capture Endpoint
  → CRM 创建或更新 Lead/Contact
  → CRM 内部完成分配、备注、联系和后续转客户
```

| 方案 | 现成功能 | 与本项目的适配判断 |
| --- | --- | --- |
| Zoho CRM Webforms | 可直接创建 Lead、Contact、Case 或自定义记录；支持隐藏字段、隐私政策勾选、审批、自动回复和 double opt-in | 最贴合“结果后提交咨询”，无需本项目做后台 |
| HubSpot Forms | 表单直接创建或更新 CRM 记录，可触发后续动作；支持隐藏字段和逐步收集信息 | 适合已有 HubSpot 账号、以联系人为中心的团队 |
| EspoCRM Web-to-Lead | 开源自托管；支持 iframe/API Lead Capture、分配、Captcha 和 double opt-in | 适合要求自托管，但需额外维护一套 CRM 服务 |
| Salesforce Web-to-Lead | 网站表单直接生成 Lead，支持来源/活动隐藏字段、分配和自动回复 | 原理成熟，但对当前体量偏重 |

官方参考（2026-09-16 核对，之后未复核）：[Zoho CRM Webforms](https://help.zoho.com/portal/en/kb/crm/connect-with-customers/webforms/articles/set-up-web-forms)、[HubSpot Forms](https://knowledge.hubspot.com/forms/create-and-edit-forms)、[EspoCRM Web-to-Lead](https://docs.espocrm.com/administration/web-to-lead/)、[Salesforce Web-to-Lead](https://help.salesforce.com/s/articleView?id=setting_up_web-to-lead.htm&language=en_US)。

推荐顺序：① SUNRISE 已在用某个 CRM 就直接用它的 Webform，不新增系统；② 尚未选型则先用 Zoho CRM Webforms 试运行一条高度人才咨询链路；③ 数据必须完全自托管再评估 EspoCRM，别因“开源”就把整套 CRM 合进本仓库；④ 只有现成 CRM 无法满足规则快照和权限要求时，才启动 README 已规划的 Django/MySQL，且先只做 `customers` 与 `diagnoses`，不做 ERP。

### D. 与本机相关项目的正确复用范围

从 `/Users/tatsuya/Documents/Projects/0629code` 借用的是已验证过的**边界处理**，不是复制它的客户/案件页面：复用“一次提交一个 `request_id`”的幂等原则；复用“先匹配、后确认”的重复客户处理思路（第一阶段可交给 CRM 自身）；复用不可静默覆盖历史记录、明确区分客户可见与内部信息的原则。不复制 Case、Checklist、Document、Accounting、复杂状态、Portal 和长客户详情页；不复制其现有对象级权限缺口；不把相关人事项目的 Organization、Branch、排班、工资或审批模型带入本项目。

### E. 两种落地层级

**Level 1：不增加后端，直接接现成 CRM**——移除诊断前置姓名/电话；增加结果页咨询卡；增加 CRM 表单或提交适配器；增加成功/失败/重复提交状态；更新隐私政策和同意文案；为 `consultation_open` / `consultation_submit` / `consultation_success` 增加非敏感打点。优点是最快验证真实需求；缺点是完整诊断快照不能安全保存到本项目数据库，第一版只传结果摘要。

**Level 2：CRM 前加一个极薄接收接口** `POST /api/consultations`，只负责：服务端校验同意和字段；用 `request_id` 防重复；过滤允许发送的诊断摘要；服务端调用 CRM API（密钥不暴露在浏览器）；保存咨询编号和投递状态供失败重试与审计。它不是 CRM，也不提供客户后台。这个层级最适合正式上线。

### F. 第一版验收标准与下一步

1. 未填写姓名或电话也能完成高度人才和永住诊断。
2. 只有结果页主动展开咨询后才出现联系信息字段；未勾选同意不能提交。
3. CRM 收到的记录含工具、规则版本、结果摘要、语言和来源，但不含未经同意的完整诊断输入。
4. 双击提交和网络重试只产生一条记录；提交失败不清空用户填写内容。
5. 租房、工资、役员报酬、在日记录和宅建不会被强行套用同一留资流程。
6. 中日双语、移动端、键盘操作保持现有行为；页面打印（Cmd/Ctrl+P）保持现有精简打印样式。
7. 没有选定 CRM 前，不写死某家供应商字段到计算器组件；通过单一 `consultationAdapter` 隔离。

推荐下一步（仍不改业务代码）：业务先确认是否已在用 Zoho/HubSpot/Salesforce 等 CRM → 确认咨询时允许收集的联系渠道及是否需要 double opt-in → 确认允许发送到 CRM 的诊断摘要字段（默认排除完整输入快照）→ 选定后用高度人才结果页做最小原型，验收后复用到永住 → 只有 Webform/CRM 实际使用后仍缺诊断历史能力，再启用 Django/MySQL 计划。
