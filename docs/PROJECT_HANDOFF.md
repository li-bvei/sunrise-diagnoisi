# SUNRISE 项目交接说明

> 文档快照：2026-09-06（Asia/Tokyo）  
> 适用对象：接手项目的 AI、前端工程师、产品/业务负责人  
> 当前状态：可运行的 Vue 前台工具集合，尚未形成后端驱动的客户案件/ERM 系统

## 1. 先看结论

- 本地 `main` 与 `origin/main` 当前都指向 `d1b1d06c39b82cd3c7c341bab8ebb0bb0543a82b`。
- 在本次文档整理前，工作区有 12 个源码/数据/环境未提交修改文件，远端提交本身没有领先或落后；这些修改必须视为用户正在进行的工作，不要自动回退。本次又增加了 3 个根目录文档修改和 `docs/` 下的 3 个交接文档。
- 当前工作区修改已经通过 TypeScript 检查、默认回归测试、实用工具测试、宅建测试和生产构建，但还没有提交，也没有完整的端到端自动化测试。
- 当前前端有 11 个工具条目、6 个业务分类；另外还有宅建考点速查和薄弱分析两个辅助路由。
- 项目没有 API、账号、数据库或案件管理。表单结果大多是页面内状态，语言、宅建学习记录和出入境记录使用 `localStorage`。
- 最大上线风险是生产构建路径：`frontend/vite.config.ts` 仍把 production `base` 写死为 `/server/`，而 Compose 默认传入 `/`。当前 `frontend/dist/index.html` 已实际生成 `/server/assets/...` 资源路径。

## 2. 当前工作区修改

相对远端提交 `d1b1d06`，当前工作区的源码/数据/环境部分为 12 个文件、约 614 行新增、272 行删除；加上本次文档整理后，tracked diff 为 15 个文件、644 行新增、280 行删除，另有 `docs/` 下 3 个新文件。下面首先列出原有 12 个工作区修改的意图：

| 文件 | 当前修改意图 | 状态判断 |
| --- | --- | --- |
| `.claude/launch.json` | 开发端口改为 5190，并启用 strict port | 环境配置，未提交 |
| `frontend/src/components/AppHeader.vue` | 移动菜单增加遮罩、Escape 关闭、焦点移入、body 滚动锁定、ARIA 属性 | 已实现，需浏览器验证焦点回收 |
| `frontend/src/components/takken/TakkenQuestionPicker.vue` | 增加“新题”筛选和新题标签 | 已实现 |
| `frontend/src/data/messages.ts` | 增加菜单关闭文案，中日双语 | 已实现 |
| `frontend/src/data/takken-questions.json` | 新增 13 道标记为 `isNew` 的题目 | 已实现，题目内容仍需业务复核 |
| `frontend/src/data/takken-topics.json` | 新增 13 个标记为 `isNew` 的考点 | 已实现，考点内容仍需业务复核 |
| `frontend/src/data/tools.ts` | 分类数量改为由工具数组计算；增加 `featured` 工具 | 已实现 |
| `frontend/src/styles/index.css` | 首页改为列表式布局；移动菜单增加 scrim；减少首页卡片密度 | 已实现，需移动端视觉回归 |
| `frontend/src/types/content.ts` | `DiagnosisTool` 增加可选 `featured` | 已实现 |
| `frontend/src/types/takken.ts` | 题目和考点增加可选 `isNew` | 已实现 |
| `frontend/src/utils/takkenQuestionModel.ts` | 解析 `isNew`，增加 `new` 状态过滤 | 已实现 |
| `frontend/src/views/HomeView.vue` | 首页改为“事项选择 → 常用工具 → 结果说明”，使用 `RouterLink` | 已实现，已修复旧版 article click 的键盘语义问题 |

不要在接手时把上述修改误认为已进入 GitHub。提交前需要再次检查 diff、构建和题库内容。

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
| `/` | 首页 | 已实现，当前工作区正在做首页减法重构 |
| `/tools` | 全部工具 | 已实现 |
| `/tools/highly-skilled` | 高度人才积分与 J-Skip 基础判断 | 已实现 |
| `/tools/permanent-residence` | 永住条件机械判断 | 已实现 |
| `/tools/rental-cost` | 租房费用/材料清单和可打印报告 | 已实现，偏工作人员使用 |
| `/tools/payroll` | 工资手取与公司成本估算 | 已实现，简化模型 |
| `/tools/standard-remuneration` | 标准报酬月额查询/反查 | 已实现，简化模型 |
| `/tools/executive-compensation` | 役员报酬方案比较 | 已实现，简化模型 |
| `/tools/pension` | 年金估算与目标反推 | 已实现，简化模型 |
| `/tools/stay-days` | 出入境记录和在日天数 | 已实现，本地保存 |
| `/tools/takken` | 宅建刷题 | 已实现，本地学习记录 |
| `/tools/takken-notes` | 宅建考点速查 | 已实现，本地进度 |
| `/tools/takken-analysis` | 宅建薄弱分析 | 已实现，支持 CSV 分析 |
| `/tools/highly-skilled-pr` | 旧地址兼容重定向 | 已实现 |
| `/tools/j-skip` | 旧地址兼容重定向 | 已实现 |
| `/guide` | 使用说明 | 已实现 |
| `/privacy` `/terms` `/disclaimer` | 法律页面 | 当前仍为占位内容 |

### 4.2 工具元数据

`frontend/src/data/tools.ts` 当前维护 11 个工具条目：

- 在留・永住：高度人才、永住
- 不动产：租房初期费用
- 收入与社会保险：工资、标准报酬、役员报酬
- 年金：领取额估算、目标反推
- 在日记录：出入境记录
- 资格考试：宅建刷题

J-Skip 已合并到高度人才页面，不应重新作为独立工具加入工具数量。

当前工作区把高度人才、永住、租房标记为 `featured`，首页只展示这些常用工具。分类数量已经改为运行时从 `tools` 计算，今后新增工具不应再手写 count。

## 5. 主要数据和规则

| 数据/规则 | 位置 | 当前信息 |
| --- | --- | --- |
| 高度人才规则 | `frontend/src/utils/highlySkilledCalculator.ts` | 规则版本 `2026-07` |
| J-Skip 规则 | `frontend/src/utils/jSkipCalculator.ts` | 规则版本 `2026-07`，嵌入高度人才结果页 |
| 永住规则 | `frontend/src/utils/permanentResidenceCalculator.ts` | 规则版本 `2026-07`，6 条路径 |
| 租房项目清单 | `frontend/src/utils/rentalCostCalculator.ts` | 清单版本 `2026-08`，金额由用户输入 |
| 工资/保险/年金 | `frontend/src/utils/financialCalculator.ts` | 简化估算，参数在 `financialParameters.ts` |
| 官方来源 | `frontend/src/data/officialSources.ts` | 集中维护入管厅来源链接 |
| 院校名单 | `frontend/src/data/universities/officialUniversities.ts` | 390 条、37 个国家/地区，源自根目录 PDF |
| 宅建题目 | `frontend/src/data/takken-questions.json` | 当前 84 道，13 道 `isNew` |
| 宅建考点 | `frontend/src/data/takken-topics.json` | 当前 84 个，13 个 `isNew` |

题库的 `isNew` 只是内容批次标签，不是永久业务状态。当前实现中，题目被答过后会从“新题”筛选中消失，因为筛选条件是 `isNew && !attempts[id]`。

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

截至本快照，在当前工作区执行：

```bash
cd frontend
npm test
node --test tests/practical-tools.test.mjs tests/takken.test.mjs
npm run build
```

结果：

- `npm test`：11 项通过；包含 `vue-tsc -b`。
- 实用工具 + 宅建测试：18 项通过。
- 合计：29 项通过。
- `npm run build`：通过。
- 构建输出约 1.07 MB 主 JS、426 KB CSS；仍有大 chunk 警告。
- 构建仍有 `@vueuse/core` 的 Rollup pure-comment 警告。
- `git diff --check`：通过。

默认 `npm test` 没有执行另外两个测试文件。若要把回归门槛变成单一命令，应新增统一的 test script 或 CI 命令。

院校 PDF 重现检查：`scripts/extract_official_universities.py --check` 需要 `pdfplumber`，当前机器的 Python 环境缺少该依赖；这不影响前端构建，但会阻塞院校数据重新生成/复核。

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
2. README、DEVELOPMENT、SUBDIRECTORY_DEPLOYMENT 与真实工具数量/规则模型不完全一致。
3. 法律页仍为占位内容。
4. 结果是前端简化计算，尚无后端校验、规则审批、历史版本审计。
5. 默认测试命令遗漏两组测试。

### 中优先级

1. `StayDaysView.vue` 使用 `toISOString()` 作为日本本地“今天”，存在时区边界错误。
2. 出入境记录删除无确认，导出缺少成功反馈。
3. 役员报酬结果把负的公司剩余利润截为 0，可能掩盖成本超出利润。
4. 宅建模式和筛选状态没有完整同步 URL，刷新/分享会丢失上下文。
5. 首页和移动菜单的最新工作区改动需要真实设备/浏览器回归。
6. 全局 `MutationObserver` 监听整个 body 来修正日期标题，维护成本较高。
7. 主包和 CSS 体积偏大，首次加载仍有优化空间。

### 低优先级/产品建设

1. 缺少保存草稿、跨设备继续和报告分享。
2. 缺少客户咨询转案件、材料补充、负责人和跟进状态。
3. analytics 目前只在开发环境 `console.debug`，没有真实数据。
4. 尚无正式隐私政策、保存期限、删除机制和后台权限模型。

## 10. 接手时不要做的事

- 不要直接 `git reset --hard` 或回退原有的 12 个源码/数据/环境未提交修改，也不要把本次新增的交接文档当作临时文件删除。
- 不要把 J-Skip 重新加成独立工具数量或独立重复表单。
- 不要把租房工具强行改成客户自助计算；当前业务定义是工作人员按实际费用清单填入，再生成客户可看的报告。
- 不要让大学中文译名覆盖官方 PDF 的 `officialName`、稳定 ID 或自动生成文件。
- 不要把前端简化计算结果表述为许可保证、正式税务结论或正式法律意见。
- 不要在后端上线前把姓名、电话、出生日期和诊断报告直接持久化。

## 11. 推荐下一步

1. 先修复并验证 Vite base path。
2. 把默认测试命令扩展为 29 项测试全量门槛。
3. 更新 README/DEVELOPMENT/部署说明，明确当前是 11 个工具、前端本地计算、哪些是占位页面。
4. 对当前首页和移动菜单改动进行实际浏览器截图回归。
5. 修复本地日期、删除确认、负利润显示和 URL 状态同步。
6. 再设计后端案件模型，不要直接从“加一个 API”开始。
