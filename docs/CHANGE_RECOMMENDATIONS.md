# SUNRISE 修改建议与 ERM 优化路线

> 这是一份面向实施的建议，不代表本文件中的所有项目已经实现。  
> 优先级：P0 = 上线阻断；P1 = 高风险/高收益；P2 = 中期质量和体验；P3 = 产品扩展。

## 1. P0：先修复部署正确性

### 问题

`frontend/vite.config.ts` 把 production `base` 写死为 `/server/`，但 `frontend/Dockerfile` 和 `docker-compose.yml` 已经设计成通过 `VITE_BASE_PATH` 传入，Compose 默认值还是 `/`。这会让文档中的根路径部署失效或产生资源 404。

### 建议修改

统一采用环境变量：

```ts
const basePath = process.env.VITE_BASE_PATH || '/'
```

实际实现时需要同时处理：

- 缺少前后斜杠时的规范化；
- `/` 和 `/server/` 两种路径；
- `createWebHistory(import.meta.env.BASE_URL)`；
- Nginx 的资源路径和 SPA fallback；
- README、Compose、Dockerfile、子路径部署说明。

### 验收标准

- 根路径构建的 `dist/index.html` 引用 `/assets/...`。
- `/server/` 构建的 `dist/index.html` 引用 `/server/assets/...`。
- 两种构建都能打开首页、工具页，并能刷新深层路由。
- CI 对两个构建模式都检查 `index.html` 和关键静态资源存在。

## 2. P1：把测试门槛变成单一命令

### 当前问题

`npm test` 只运行 `tests/regression.test.mjs`，实用工具和宅建测试必须额外手动执行。当前工作区虽然 29 项全部通过，但很容易在提交时漏跑 18 项。

### 建议修改

在 `frontend/package.json` 中增加：

```json
{
  "scripts": {
    "test": "vue-tsc -b && node --test tests/*.test.mjs",
    "test:regression": "node --test tests/regression.test.mjs",
    "test:practical": "node --test tests/practical-tools.test.mjs",
    "test:takken": "node --test tests/takken.test.mjs"
  }
}
```

同时增加一份 CI 或发布前检查：

- typecheck；
- 全部 Node tests；
- build；
- base path smoke test；
- 题库结构检查；
- 院校 PDF `--check`（使用固定 Python 依赖环境）。

## 3. P1：统一项目事实和交接文档

### 当前问题

README、DEVELOPMENT 和部署说明仍有 3、9、11 个工具等不同阶段的描述，也有“确定分/待确认分”与当前简化结果模型不一致的问题。

### 建议修改

- 以 `docs/PROJECT_HANDOFF.md` 作为 AI 交接事实入口。
- README 保留面向使用者的安装、运行和产品概览。
- DEVELOPMENT 只保留当前有效的维护约束；旧计划移入“历史计划”或删除。
- SUBDIRECTORY_DEPLOYMENT 只描述经过构建验证的行为。
- 每次新增工具时同时更新工具元数据、路由、测试和工具数量。

### 验收标准

- 全仓库搜索“3 个”“9 个”“11 个”后，只有合理的历史说明或当前事实。
- 文档明确 11 个工具、6 个分类、3 个主要诊断工具和宅建辅助页面的区别。
- 文档明确哪些页面是客户自助、哪些页面是工作人员使用。

## 4. P1：修复移动端任务路径

当前工作区已经把首页改成较轻的列表式入口，方向是正确的，但还需要实机验证。后续建议继续保持“减少选择成本”的原则。

### 首页

- 保留一个主 CTA：选择要确认的事项。
- 常用工具只展示 3 个，其他工具进入全部工具页。
- 分类行必须是可键盘访问的 `RouterLink` 或按钮。
- 不要恢复首页大面积模拟结果卡、三步介绍和重复工具卡墙。

### 诊断表单

- 首屏直接说明耗时、需要准备的资料和结果用途。
- 规则说明折叠或移动到表单旁边，不要把第一项输入推到第二屏以后。
- 每一步显示“已完成/剩余必填/预计剩余时间”。
- 表单校验应在字段旁边出现，不要只在顶部弹消息。
- 结果页提供“缺少材料”“下一步”“重新计算”“保存/打印”四个明确动作。

### 宅建学习

- “新题”是有价值的功能，建议显示批次日期或题库版本，不要让用户不知道新题来自哪一批。
- 练习模式、分类、标签和当前题号应同步 URL，支持刷新和分享。
- 题库内容建议显示来源年份、法令时点和内容复核日期。

## 5. P1：数据安全和本地状态边界

### 出入境记录

目标文件：`frontend/src/views/StayDaysView.vue`、`frontend/src/utils/stayCalculator.ts`。

建议：

- 使用本地日期格式化函数代替 `new Date().toISOString().slice(0, 10)`。
- 删除前使用确认对话框，并提供撤销窗口或最近删除记录。
- CSV 导出后显示成功反馈；导出失败时显示明确原因。
- 增加“导入 CSV”“导出全部数据”“清空本地数据”三个明确入口。
- 页面顶部明确说明数据只存在本设备，清除浏览器数据会丢失记录。

### 宅建记录

目标文件：`frontend/src/utils/takkenStorage.ts`。

建议：

- 保留现有版本迁移机制。
- 为每个存储版本提供清理/导出策略。
- 上传 CSV 后显示文件名、导入时间、记录数和清除按钮。
- 不要把身份证、客户材料或咨询信息放进这些学习存储 key。

## 6. P1：计算规则要变成可审计的规则模块

当前规则散落在计算器、文案和数据文件中。对于入管、税务、社保和年金，建议统一抽象出：

```ts
type RuleMetadata = {
  id: string
  version: string
  effectiveFrom: string
  reviewedAt: string
  sourceUrls: string[]
  assumptions: string[]
  reviewStatus: 'draft' | 'reviewed' | 'published'
}
```

每个结果快照应至少包含：

- 输入快照；
- 结果快照；
- 规则版本；
- 适用日期；
- 来源链接；
- 简化假设；
- 需要人工确认的项；
- 生成时间。

这不是为了让前端变复杂，而是为了未来保存案件后能够解释：“当时为什么得到这个结果”。

### 具体规则问题

- `financialCalculator.ts` 不要把负的公司剩余利润直接截成 0；应显示“赤字/成本超出利润”状态。
- 税务、社保、年金参数应区分“官方常量”“简化估算”“用户输入”。
- 住民税当前部分由用户输入，UI 要明确说明不是系统根据所得自动核算。
- 永住和高度人才的边界值应有系统化测试，而不只是少量回归测试。
- 规则更新后必须同时更新版本、来源、文案、测试和交接文档。

## 7. P1：正式法律页面和责任边界

当前 `/privacy`、`/terms`、`/disclaimer` 仍是占位内容。公开使用前必须补齐：

- 运营主体和联系方式；
- 收集哪些数据、为何收集；
- 本地数据和服务器数据的区别；
- 保存期限、删除方式、第三方服务；
- 计算结果不是许可保证、税务意见或正式法律意见；
- 使用官方来源但仍需个案审查的说明；
- 咨询提交前的同意记录。

不要在法律页面完成前接入客户姓名、电话、诊断报告的后端持久化。

## 8. P2：前端质量和性能

### Bundle

当前主 JS 约 1.07 MB，CSS 约 426 KB。建议：

- 将宅建题库、考点和薄弱分析数据继续做路由级或数据级懒加载；
- 检查 `index` 主 chunk 为什么仍然很大；
- 把只在报告打印时使用的组件延迟加载；
- 检查 Element Plus 按需引入和图标打包；
- 不要只提高 chunk warning limit 来掩盖体积问题。

### 日期组件

`App.vue` 当前通过全局 `MutationObserver` 监听整个 body 来修正日期标题。建议优先：

1. 先确认 Element Plus locale 配置能否覆盖全部目标文案；
2. 如果必须观察 DOM，把观察范围缩小到日期弹层；
3. 将浏览器行为写入一个 UI 回归用例，避免升级 Element Plus 后悄悄失效。

### 标题和语言

`PublicLayout.vue` 和 `router/index.ts` 都在设置 `document.title`。建议保留一个来源，优先让布局通过 Pinia 当前语言响应式更新标题，路由只提供 title metadata。

## 9. P2：无障碍验收清单

当前工作区已改善首页链接语义和移动菜单焦点入口，但仍建议逐页验收：

- 键盘 Tab 是否能到达所有自定义按钮、筛选、学校结果和收藏按钮；
- 所有焦点元素是否有清晰 `:focus-visible`；
- 抽屉打开后焦点是否被限制在抽屉内，关闭后是否回到菜单按钮；
- Escape、遮罩点击、浏览器返回是否都能关闭抽屉；
- 表单错误是否使用 `aria-describedby` 和可读文本；
- 题目反馈是否在 `aria-live` 中被读出；
- 日文和中文切换后 `html[lang]`、页面标题和日期控件是否一致；
- 颜色不能作为唯一的正确/错误/状态提示。

## 10. P3：从工具集合升级为 ERM

### 10.1 先定义业务对象

推荐最小领域模型：

```text
Customer 客户
  └─ Case 案件
      ├─ Diagnosis 诊断记录
      ├─ Evidence 材料/证据
      ├─ Task 待办
      ├─ Note 沟通记录
      ├─ Assignment 负责人/协作者
      ├─ StatusHistory 状态历史
      └─ AuditLog 操作审计
```

### 10.2 客户端与工作人员端分离

当前前台同时包含客户自助诊断、工作人员租房清单和个人宅建学习工具。长期建议按角色拆分：

- 客户端：选择事项、填写诊断、查看结果、提交咨询、补充材料。
- 工作人员端：案件列表、客户资料、材料清单、结果复核、任务、沟通和报告。
- 管理端：规则版本、权限、审计日志、数据留存和统计。

不要让工作人员工作流继续隐藏在公开客户前台中。

### 10.3 案件状态建议

```text
new
→ diagnosis_in_progress
→ result_ready
→ awaiting_evidence
→ under_review
→ consultation_scheduled
→ completed
→ archived
```

每次状态变化要记录操作者、时间、原因和可见范围。

### 10.4 最小可用 ERM 版本

第一版后端不需要一次做完所有功能，建议只做：

1. 客户/案件编号；
2. 诊断结果快照；
3. 材料 checklist；
4. 负责人和待办；
5. 基础状态历史；
6. 导出报告；
7. 登录、权限和审计日志。

这样才能解决“诊断完成后无人跟进、材料散落、结果无法追溯”的核心问题。

## 11. 建议的数据和 API 边界

```text
frontend/
  public self-service UI

backend/
  auth/
  customers/
  cases/
  diagnoses/
  evidence/
  tasks/
  rules/
  audit/
```

建议 API 以案件为中心，而不是为每个页面单独做一个临时 endpoint：

- `POST /api/cases`
- `GET /api/cases/:id`
- `POST /api/cases/:id/diagnoses`
- `POST /api/cases/:id/evidence`
- `POST /api/cases/:id/tasks`
- `POST /api/cases/:id/status-transitions`
- `GET /api/rules/:tool/:version`

所有诊断保存都要带 `toolId`、`ruleVersion`、`locale`、`inputSnapshot`、`resultSnapshot`、`createdAt` 和 consent 记录。

## 12. 推荐实施顺序

### Sprint 0：发布安全

- 修复 base path；
- 测试合并为单一命令；
- 构建根路径/子路径 smoke test；
- 文档数字和功能状态统一；
- 补齐法律页面最小版本。

### Sprint 1：前台可用性

- 当前首页重构的浏览器回归；
- 高度人才/永住表单减少首屏说明占用；
- 字段级校验和剩余步骤提示；
- 本地日期、删除确认、导出提示；
- URL 同步宅建练习状态；
- 无障碍键盘验收。

### Sprint 2：结果和咨询衔接

- 缺少材料列表；
- 结果来源、规则版本、适用日期；
- 打印/PDF 稳定性；
- 咨询 CTA 和可选留资；
- 草稿恢复与数据清除入口。

### Sprint 3：ERM MVP

- 登录和角色；
- 客户/案件；
- 诊断快照；
- 材料 checklist；
- 任务和负责人；
- 审计日志。

### Sprint 4：运营和治理

- 规则审批和版本发布；
- 数据留存/删除/备份；
- 错误监控和真实 analytics；
- 权限审计；
- 性能预算和持续部署门槛。

## 13. 每次修改的完成定义

每个功能变更至少满足：

1. 代码、类型、测试、文案和文档同步；
2. 中日双语都能显示；
3. 根路径和子路径构建可用；
4. 桌面和 390px 移动端没有明显布局问题；
5. 键盘和错误状态可操作；
6. 如果涉及规则，包含来源、版本、适用日期和边界测试；
7. 如果涉及个人信息，说明存储位置、同意和删除方式；
8. `npm test`、`npm run build` 和 `git diff --check` 全部通过。

