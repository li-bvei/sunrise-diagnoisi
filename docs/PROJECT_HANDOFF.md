# SUNRISE 项目交接说明

> 文档快照：2026-09-16（Asia/Tokyo）
> 适用对象：接手项目的 AI、前端工程师、产品/业务负责人  
> 当前状态：可运行的 Vue 前台工具集合，尚未形成后端驱动的客户案件/ERM 系统

## 1. 先看结论

- 2026-09-16 已执行 `git fetch --prune origin`；本地 `main` 与 `origin/main` 均指向 `1c25b3b5a054bf88e9aaf1c9048554d10187b4af`，提交层面 `0 ahead / 0 behind`。
- 工作区并不干净：用户已有 `frontend/src/data/takken-questions.json` 和 `frontend/src/data/takken-topics.json` 两个未提交修改；本次只另行修改本交接文档，不改任何代码或数据文件。
- 当前代码已通过 TypeScript 检查、31 项自动化测试和生产构建；项目仍没有端到端浏览器测试，院校 PDF 重现检查也因本机缺少 `pdfplumber` 未能执行。
- 当前前端有 7 个工具条目、5 个业务分类；宅建考点速查和薄弱分析是辅助路由，不计入工具条目。
- 项目没有 API、账号、数据库或案件管理。表单结果大多是页面内状态，语言、宅建学习记录和出入境记录使用 `localStorage`。
- 最大上线风险是生产构建路径：`frontend/vite.config.ts` 仍把 production `base` 写死为 `/server/`，而 Compose 默认传入 `/`。当前 `frontend/dist/index.html` 已实际生成 `/server/assets/...` 资源路径。

## 2. 当前工作区修改

相对 `origin/main`，本次检查开始时只有两份用户数据修改：

| 文件 | 当前修改意图 | 状态判断 |
| --- | --- | --- |
| `frontend/src/data/takken-questions.json` | 101 → 116 道，新增 `h25-7` 等 15 道题 | JSON、ID 唯一性和现有题库测试通过；法律内容仍需业务复核 |
| `frontend/src/data/takken-topics.json` | 101 → 113 个考点，新增 `t102` 至 `t113` | JSON、ID 唯一性通过；考点准确性仍需业务复核 |

不要把这两份修改误认为已经进入 GitHub，也不要在后续文档或功能改动中顺带提交、回退或重写它们。

## 3. 技术架构

### 3.1 技术栈

- Vue 3、Composition API、TypeScript strict mode
- Vite、Vue Router history mode、Pinia
- Element Plus 与 Element Plus Icons
- Axios 仅作为预留依赖，当前没有实际 API 请求
- Nginx 静态托管、Docker 多阶段构建
- 测试使用 Node test runner 和 `vue-tsc`

### 3.2 目录职责

```text
frontend/src/
├─ components/  公共组件、报告、题库组件
├─ data/        双语文案、工具元数据、题库、院校名单、官方来源
├─ layouts/     公共前台布局
├─ router/      路由和页面标题
├─ stores/      Pinia 设置状态，目前主要是语言
├─ styles/      全局主题、组件样式、响应式规则
├─ types/       领域类型
├─ utils/       计算规则、数据解析、本地存储、打点
└─ views/       页面级工具和静态页面
```

项目主体是前端本地计算，没有服务端领域层。法律、移民、税务和社保规则目前直接存在 `utils/` 与 `data/` 中。

## 4. 路由和功能清单

### 4.1 公开路由

| 路由 | 用途 | 当前状态 |
| --- | --- | --- |
| `/` | 首页 | 已实现，Apple 风格的事项选择与常用工具入口 |
| `/tools` | 全部工具 | 已实现 |
| `/tools/highly-skilled` | 高度人才积分与 J-Skip 基础判断 | 已实现 |
| `/tools/permanent-residence` | 永住条件机械判断 | 已实现 |
| `/tools/rental-cost` | 租房费用/材料清单和可打印报告 | 已实现，偏工作人员使用 |
| `/tools/salary` | 工资、社保、到手与公司成本估算 | 已实现，简化模型 |
| `/tools/executive-compensation` | 役员报酬方案比较 | 已实现，简化模型 |
| `/tools/stay-days` | 出入境记录和在日天数 | 已实现，本地保存 |
| `/tools/takken` | 宅建刷题 | 已实现，本地学习记录 |
| `/tools/takken-notes` | 宅建考点速查 | 已实现，本地进度 |
| `/tools/takken-analysis` | 宅建薄弱分析 | 已实现，支持 CSV 分析 |
| `/tools/highly-skilled-pr` `/tools/j-skip` | 旧地址兼容 | 重定向到高度人才工具 |
| `/tools/payroll` `/tools/standard-remuneration` | 旧地址兼容 | 重定向到工资工具 |
| `/tools/pension` | 已下线旧工具 | 重定向到工具中心 |
| `/guide` | 使用说明 | 已实现 |
| `/privacy` `/terms` `/disclaimer` | 法律页面 | 当前仍为占位内容 |

### 4.2 工具元数据

`frontend/src/data/tools.ts` 当前维护 7 个工具条目：

- 在留・永住：高度人才、永住
- 不动产：租房初期费用
- 收入与经营：工资、役员报酬
- 在日记录：出入境记录
- 资格考试：宅建刷题

J-Skip 已合并到高度人才页面，不应重新作为独立工具加入工具数量。

高度人才、永住、租房被标记为 `featured`，首页只展示这些常用工具。分类数量从 `tools` 运行时计算，今后新增工具不应再手写 count。

## 5. 主要数据和规则

| 数据/规则 | 位置 | 当前信息 |
| --- | --- | --- |
| 高度人才规则 | `frontend/src/utils/highlySkilledCalculator.ts` | 规则版本 `2026-07` |
| J-Skip 规则 | `frontend/src/utils/jSkipCalculator.ts` | 规则版本 `2026-07`，嵌入高度人才结果页 |
| 永住规则 | `frontend/src/utils/permanentResidenceCalculator.ts` | 规则版本 `2026-07`，6 条路径 |
| 租房项目清单 | `frontend/src/utils/rentalCostCalculator.ts` | 清单版本 `2026-08`，金额由用户输入 |
| 工资/保险/役员报酬 | `frontend/src/utils/financialCalculator.ts` | 简化估算，参数在 `financialParameters.ts` |
| 官方来源 | `frontend/src/data/officialSources.ts` | 集中维护入管厅来源链接 |
| 院校名单 | `frontend/src/data/universities/officialUniversities.ts` | 390 条、37 个国家/地区，源自根目录 PDF |
| 宅建题目 | `frontend/src/data/takken-questions.json` | 当前工作区 116 道；其中 15 道尚未提交 |
| 宅建考点 | `frontend/src/data/takken-topics.json` | 当前工作区 113 个；其中 12 个尚未提交 |

题库支持可选 `isNew` 批次标签，但当前工作区新增内容没有设置该标记。题目内容属于法律/考试业务数据，自动测试只能验证结构与交互，不能替代人工核对法条版本和答案。

## 6. 浏览器本地存储

| Key | 内容 | 风险/限制 |
| --- | --- | --- |
| `sunrise-diagnosis-locale` | 中日语言偏好 | 非敏感，适合保留 |
| `sunrise-diagnosis-takken-attempts` | 宅建答题统计、复习记录 | 版本为 2，有迁移和历史上限 20 |
| `sunrise-diagnosis-takken-exam-date` | 宅建考试日期 | 仅当前浏览器 |
| `sunrise-diagnosis-takken-upload` | 宅建 CSV 分析结果 | 可能包含用户上传的学习记录 |
| `sunrise-diagnosis-takken-favorites` | 宅建收藏题目 | 仅当前浏览器 |
| `sunrise-diagnosis-stay-records-v1` | 出入境记录 | 具有个人信息属性，删除/导出体验需要加强 |

高度人才、永住和租房页面的姓名、电话、出生日期及报告表单状态原则上只存在当前页面状态，不应随意写入 localStorage、URL、日志或 API。

## 7. 当前验证结果

2026-09-16 在当前工作区执行：

```bash
cd frontend
npm test
npm run build
```

结果：

- `npm test`：31/31 通过；命令已包含 `vue-tsc -b` 和 `tests/*.test.mjs` 全部三个测试文件。
- `npm run build`：通过；共转换 1,698 个模块。
- 构建输出约 1.07 MB 主 JS、429 KB CSS；仍有大 chunk 警告。
- 构建仍有 `@vueuse/core` 的 Rollup pure-comment 警告。
- `git diff --check`：通过。
- 所有 JSON 可解析；两份宅建数据当前均无重复 ID。
- 所有 `.mjs` 通过 `node --check`；Python 提取脚本通过 AST 语法解析；`scripts/deploy.sh` 通过 `bash -n`。
- `docker compose config --quiet`：通过。
- 7 份 tracked Markdown 的本地相对链接有效，代码围栏成对。

验证边界：没有端到端浏览器/真实移动端/打印预览自动化；没有安装 `shellcheck`；`scripts/extract_official_universities.py --check` 因本机缺少 `pdfplumber` 未执行成功。这些是“未覆盖”，不能写成已通过。

## 8. 部署和上线风险

### 8.0 服务器更新流程

服务器把仓库 clone 到站点目录（示例 `/www/wwwroot/sunrise-diagnoisi`），更新用 `scripts/deploy.sh`：`git fetch` → `git reset --hard <ref>` → `docker compose up -d --build --remove-orphans` → `docker image prune` → 等待健康检查 → `docker compose ps`。服务器只作部署目标，`reset --hard` 会覆盖已跟踪文件的本地改动；根目录 `.env`（被 .gitignore 忽略）用于保存 `VITE_BASE_PATH`，不受影响。详见 README「在服务器上更新部署」。

### 8.1 Vite base path 是当前最高风险

当前配置：

- `frontend/vite.config.ts`：production `base` 写死 `/server/`。
- `frontend/Dockerfile`：声明了 `VITE_BASE_PATH`，但 Vite 配置没有读取该环境变量。
- `docker-compose.yml`：默认 build arg 是 `/`。
- 当前 `frontend/dist/index.html`：资源路径为 `/server/assets/...`。

所以“根路径部署”和“`/server/` 子路径部署”只能有一个隐含成立，文档所说的可配置行为实际上没有实现。接手者必须先统一方案，再修改配置、部署说明和构建断言。

### 8.2 Nginx

当前有基础安全响应头、gzip、健康检查、静态资源长缓存和 SPA fallback。仍可考虑：

- 在确认外部代理责任后增加 CSP/HSTS。
- 对 HTML 和静态资源缓存策略做真实部署验证。
- 增加根路径和子路径的 smoke test。

## 9. 已知缺陷和未完成项

### 高优先级

1. `VITE_BASE_PATH` 与 Vite production base 不一致，可能白屏。
2. `README.md` 声称 `VITE_BASE_PATH` 已驱动 Vite `base`，但当前代码没有实现；`SUBDIRECTORY_DEPLOYMENT.md` 和 `docs/README.md` 反而正确提示此问题。
3. 法律页仍为占位内容。
4. 结果是前端简化计算，尚无后端校验、规则审批、历史版本审计。
5. 两份未提交宅建数据包含 15 道题和 12 个考点，结构测试通过，但法条、年份、答案和中日文内容仍需业务复核。

### 中优先级

1. 全局 `MutationObserver` 监听整个 body 来修正日期标题，维护成本较高。
2. 主包和 CSS 体积偏大，首次加载仍有优化空间。
3. 目前没有真实浏览器端到端、打印结果和 390px 移动端回归。
4. `officialSources.ts` 里的外部官方链接未在本次检查中逐一做在线可用性验证。
5. Python 数据脚本没有声明/安装可复现依赖，本机缺少 `pdfplumber`。

### 低优先级/产品建设

1. 缺少保存草稿、跨设备继续和报告分享。
2. 缺少客户咨询转案件、材料补充、负责人和跟进状态。
3. analytics 目前只在开发环境 `console.debug`，没有真实数据。
4. 尚无正式隐私政策、保存期限、删除机制和后台权限模型。

## 10. 接手时不要做的事

- 不要直接 `git reset --hard`，也不要回退或顺带提交现有两份宅建 JSON 修改。
- 不要把 J-Skip 重新加成独立工具数量或独立重复表单。
- 不要把租房工具强行改成客户自助计算；当前业务定义是工作人员按实际费用清单填入，再生成客户可看的报告。
- 不要让大学中文译名覆盖官方 PDF 的 `officialName`、稳定 ID 或自动生成文件。
- 不要把前端简化计算结果表述为许可保证、正式税务结论或正式法律意见。
- 不要在后端上线前把姓名、电话、出生日期和诊断报告直接持久化。
- 不要直接复制旧 ERP 的客户详情页；应复用其成熟的数据原则，同时修正“页面过长、客户与案件上下文混杂、权限不细”的问题。

## 11. 从提交历史推断的产品意图

提交从 2026-07-27 的诊断前台起步，依次加入高度人才/永住、租房报告、宅建学习、财务工具、在日记录，再在 2026-09-09 合并重复财务工具、下线不可靠的年金估算并统一视觉。由此可推断当前产品要求：

1. 核心不是“尽可能多的计算器”，而是可信、可解释、可维护的在日生活与经营辅助入口。
2. 先做前端本地计算和清晰报告，规则不够可靠的功能宁可下线。
3. 中日双语、移动端、打印结果、官方来源和风险说明是基础能力。
4. 个人信息按业务最小化采集，不能为了 CRM 方便而让所有工具统一索要姓名、生日、电话。
5. 后续方向是“诊断/咨询 → 客户 → 案件 → 材料与跟进”，但与旧行政书士 ERP 解耦，不能把公开前台变成内部后台。
6. 客户页面应服务持续关系和多案件复用；案件页面负责具体业务推进，二者不能合成一张超长表单。

## 12. 对“客户页面”意图的修正结论

这里的“客户页面”不是要在本项目中重建旧 ERP 的 Customer 360 或案件工作台，而是指**当前面向客户的诊断页面及诊断后的咨询衔接**。

这一结论直接来自现有代码和文档：

- `README.md` 已明确写出“结果页后置的可选咨询留资，取代早期表单前置收集姓名电话的设计”。
- `HighlySkilledView.vue` 和 `PermanentResidenceView.vue` 目前仍在诊断前收集姓名、电话，这是尚未完成的旧交互，不是目标形态。
- 高度人才报告已经具备 `reportId`、`generatedAt`、`locale`、规则版本、输入快照和结果快照；无需重做计算或报告模型。
- `analytics.ts` 已有 `tool_view` / `tool_complete` 接口点，后续只需扩展提交咨询事件，不需要重构所有工具。
- 项目原则是独立诊断前台、最小化收集个人信息、不接入旧 ERP；租房工具仍保持工作人员清单工具，不强制套用客户留资。

因此应采用成熟 CRM 的 **Web-to-Lead / Webform** 模式：诊断留在当前 Vue 页面中完成；只有用户看完结果、主动请求人工复核并同意数据使用时，才把最小联系信息和诊断摘要送到现成 CRM。

## 13. 保留现有代码的页面改法

### 13.1 诊断阶段不留资

高度人才和永住页面保留现有步骤、计算器、规则说明、结果明细和报告打印，只做以下调整：

1. 姓名、电话从诊断必填步骤移出，不再阻挡计算。
2. 诊断所需的出生日期、收入、职历等仍按计算规则保留，但默认只存在当前页面。
3. 结果仍由现有计算器生成，不改积分、永住路径、J-Skip 或报告逻辑。
4. 页面继续明确“输入未发送、未保存”。

### 13.2 结果页增加可选咨询卡

放在结果、建议和免责声明之后，不做全局弹窗骚扰：

```text
需要 SUNRISE 人工复核本次结果？
[提交本次诊断进行咨询]
```

展开后只收集：

- 姓名；
- 一种可联系渠道（电话或邮箱，按业务最终确认）；
- 希望联系的语言/方式；
- 可选咨询说明；
- 个人信息使用说明与明确同意。

系统自动附带、不让客户重复填写：

- `tool_id`；
- `report_id`；
- `rule_version`；
- `locale`；
- 结果摘要，例如 `reaches80` / `reaches70` / `below70`、永住路径及是否初步符合；
- 提交页面与时间；
- 一次提交对应的 `request_id`。

默认不向外部 CRM 发送完整 `inputSnapshot`，尤其不发送出生日期、详细收入、证件信息或全部勾选内容。需要正式受理时再由工作人员在明确说明用途后补充。

### 13.3 提交后的状态

成功后只显示：

- 已收到咨询；
- 咨询编号；
- 预计联系渠道；
- 本次提交了哪些信息；
- 撤回或删除请求的联系方式。

失败时保留用户刚填写的咨询字段并允许重试；同一个 `request_id` 重试不得产生重复 Lead。

## 14. 现成做法与候选产品

### 14.1 最贴合：CRM Webform / Web-to-Lead

这是成熟 CRM 已经提供的标准入口，不需要本项目先开发客户列表、案件状态机、时间线和任务系统。

工作原理：

```text
当前 Vue 诊断结果
  → 用户主动展开咨询表单并同意
  → Webform / Lead Capture Endpoint
  → CRM 创建或更新 Lead/Contact
  → CRM 内部完成分配、备注、联系和后续转客户
```

可选方案：

| 方案 | 现成功能 | 与本项目的适配判断 |
| --- | --- | --- |
| Zoho CRM Webforms | 可直接创建 Lead、Contact、Case 或自定义记录；支持隐藏字段、隐私政策勾选、审批、自动回复和 double opt-in | 最贴合当前“结果后提交咨询”，无需本项目做后台 |
| HubSpot Forms | 表单直接创建或更新 CRM 记录，可触发后续动作；支持隐藏字段和逐步收集信息 | 适合已有 HubSpot 账号、以联系人为中心的团队 |
| EspoCRM Web-to-Lead | 开源自托管；支持 iframe/API Lead Capture、分配、Captcha 和 double opt-in | 适合要求自托管，但需要额外维护一套 CRM 服务 |
| Salesforce Web-to-Lead | 网站表单直接生成 Lead，支持来源/活动隐藏字段、分配和自动回复 | 原理成熟，但对当前体量明显偏重 |

官方参考（2026-09-16 核对）：

- [Zoho CRM Webforms](https://help.zoho.com/portal/en/kb/crm/connect-with-customers/webforms/articles/set-up-web-forms)
- [HubSpot Forms](https://knowledge.hubspot.com/forms/create-and-edit-forms)
- [EspoCRM Web-to-Lead](https://docs.espocrm.com/administration/web-to-lead/)
- [Salesforce Web-to-Lead](https://help.salesforce.com/s/articleView?id=setting_up_web-to-lead.htm&language=en_US)

### 14.2 推荐选择顺序

1. 如果 SUNRISE 已在使用某个 CRM，直接使用它的 Webform/Web-to-Lead，不新增系统。
2. 如果尚未选 CRM，先用 Zoho CRM Webforms 做一条高度人才咨询链路试运行。
3. 如果客户数据必须完全自托管，再评估 EspoCRM；不要因为“开源”就直接把整套 CRM 合进本仓库。
4. 只有现成 CRM 无法满足规则快照和权限要求时，才启动 README 已规划的 Django/MySQL，且先只做 `customers` 与 `diagnoses`，不做 ERP。

## 15. 与本机相关项目的正确复用范围

从 `/Users/tatsuya/Documents/Projects/0629code` 借用的是已经验证过的**边界处理**，不是复制它的客户/案件页面：

- 复用一次提交一个 `request_id` 的幂等原则；
- 复用“先匹配、后确认”的重复客户处理思路，但第一阶段可交给 CRM 自身；
- 复用不可静默覆盖历史记录的原则；
- 复用明确区分客户可见与内部信息的原则；
- 不复制 Case、Checklist、Document、Accounting、复杂状态、Portal 和长客户详情页；
- 不复制其现有对象级权限缺口；
- 不把相关人事项目的 Organization、Branch、排班、工资或审批模型带入本项目。

## 16. 两种落地层级

### Level 1：不增加后端，直接接现成 CRM

改动范围仅为：

- 移除诊断前置姓名/电话；
- 增加结果页咨询卡；
- 增加 CRM 表单或提交适配器；
- 增加成功/失败/重复提交状态；
- 更新隐私政策和同意文案；
- 为 `consultation_open` / `consultation_submit` / `consultation_success` 增加非敏感打点。

优点是最快验证真实需求；缺点是诊断完整快照仍不能安全保存到本项目数据库。第一版只传结果摘要即可。

### Level 2：CRM 前增加一个极薄接收接口

如果不希望浏览器直接连接第三方 CRM，只增加：

```text
POST /api/consultations
```

该接口只负责：

1. 服务端校验同意和字段；
2. 用 `request_id` 防重复；
3. 过滤允许发送的诊断摘要；
4. 服务端调用 CRM API，避免密钥暴露在浏览器；
5. 保存咨询编号和投递状态，供失败重试与审计。

它不是 CRM，也不提供客户后台；CRM 仍负责联系人、分配和跟进。这个层级最适合正式上线。

## 17. 第一版验收标准

1. 未填写姓名或电话也能完成高度人才和永住诊断。
2. 只有结果页主动展开咨询后才出现联系信息字段。
3. 未勾选同意不能提交。
4. CRM 收到的记录包含工具、规则版本、结果摘要、语言和来源，但不包含未经同意的完整诊断输入。
5. 双击提交和网络重试只产生一条记录。
6. 提交失败不清空用户填写内容。
7. 租房、工资、役员报酬、在日记录和宅建不会被强行套用同一留资流程。
8. 中日双语、移动端、键盘操作和打印结果保持现有行为。
9. 没有选定 CRM 前，不写死某家供应商字段到计算器组件；通过单一 `consultationAdapter` 隔离。

## 18. 推荐下一步（仍不改业务代码）

1. 业务先确认是否已经在使用 Zoho、HubSpot、Salesforce 或其他 CRM。
2. 确认咨询时允许收集的联系渠道，以及是否需要 double opt-in。
3. 确认允许发送到 CRM 的诊断摘要字段，默认排除完整输入快照。
4. 选定 CRM 后，用高度人才结果页做一条最小原型；验收后再复用到永住。
5. 只有当 Webform/CRM 实际使用后仍缺少诊断历史能力，再启用 Django/MySQL 计划。
