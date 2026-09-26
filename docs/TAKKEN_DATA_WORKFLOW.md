# 宅建刷题数据维护指南

给人类和 AI 会话看的操作手册：怎么往宅建模块（错题库 + 考点速查）里加内容、加完怎么同步上线。

## 先看这一节：数据现在存在数据库里

宅建的错题库和考点速查存在**宝塔 MySQL**中，由 `server/` 里的小型 API（`takken-api` 容器）读写，网站进入宅建页面前从 `/api/takken/...` 加载。

- **加/改内容 = 调用 API**，用本文档里的两个脚本，**不需要改代码、不需要 `git commit`、不需要重新部署**，写入后刷新网站就能看到。
- `frontend/src/data/takken-questions.json`、`takken-topics.json` **只是导出的备份快照**，网站不再读取它们。**不要直接手改这两个文件**——改了网站也不会变，而且下次导出会被覆盖。
- 因为是逐条写入数据库，多个人/多个窗口同时加内容不会互相覆盖（这正是从单个 JSON 文件迁移过来的原因）。

## 一、一次性配置（在你写内容的电脑上）

脚本需要知道 API 地址和写入令牌。在 `frontend/.env.takken`（已被 `.gitignore` 忽略，不会提交）里写：

```bash
TAKKEN_API_URL=https://你的域名/server/api     # 结尾不要加斜杠；根路径部署就是 https://你的域名/api
TAKKEN_ADMIN_TOKEN=与服务器 .env 里 TAKKEN_ADMIN_TOKEN 相同的那串
```

也可以不建文件，直接用环境变量传。服务器端怎么建库、怎么配 `.env` 见根目录 [`README.md`](../README.md)「题库 API 与数据库」。

## 二、错题怎么加——`upsert-takken-questions.mjs`

```bash
cd frontend
node scripts/upsert-takken-questions.mjs <题目.json>       # 从文件写入
cat 题目.json | node scripts/upsert-takken-questions.mjs   # 从 stdin 写入（配合 heredoc 很好用）
node scripts/upsert-takken-questions.mjs --dry-run <文件>  # 校验并预览会新增/覆盖几条，不真的写
node scripts/upsert-takken-questions.mjs --import <文件>   # 导入/恢复备份：覆盖内容但不增加错误次数（可重复执行）
```

输入是一个题目对象，或者一个题目对象数组（一次提交多道）：

```json
{
  "id": "h27-3",
  "tag": "权利关系・赁贷借/使用贷借",
  "title": "平成27年 問3",
  "stem": "日文原题题干",
  "options": ["选项1", "选项2", "选项3", "选项4"],
  "correct": 0,
  "explain": "中文解析",
  "takeaway": "一句话记忆口诀"
}
```

字段说明：

- `id`：唯一，惯例是「年份+题号」，例如 `h27-3`（平成27年問3）、`r03-10-11`（令和3年10月問11）、`r07-9`（令和7年問9）。
- `tag`：`大科目・细分考点`。大科目只能是这 5 个之一：`权利关系` / `法令上的限制` / `税に関する法令` / `宅地建物取引业法等` / `5问免除科目`。
- `options` / `correct`：4 个选项 + 正确答案下标（0 开始）。也支持新版 `options: [{id,text,explainZh}]` + `correctOptionId` 的写法，手写新题用上面的简单写法就够了。
- 按 `id` 覆盖：已存在的 `id` 会被替换（用于修正内容），新 `id` 会被追加到最后。
- 数据会在本地和服务器**两处**校验（id 非空、4 个选项、答案下标合法等），不合格直接报错、不写入。

### 「重点关注」机制（`timesReported`）

同一道题（同一个 `id`）被再次提交，服务器会自动把它的 `timesReported` 计数 **+1**（数据库里原子累加，多个窗口同时提交也不会算错），不需要手动传这个字段。计数 ≥ 2 时，这道题会在刷题卡片、选题面板、薄弱分析页高亮成「🔥 重点关注」——语义是「这道题被真实反复记录做错」。所以**只有确实是同一题又错了一次才重新提交它的 `id`**；单纯改错别字也会 +1，如不想增加，在输入里显式写上当前的 `timesReported` 即可覆盖。

## 三、考点速查怎么加——`upsert-takken-topics.mjs`

```bash
cd frontend
node scripts/upsert-takken-topics.mjs <考点.json>
cat 考点.json | node scripts/upsert-takken-topics.mjs
node scripts/upsert-takken-topics.mjs --dry-run <文件>
node scripts/upsert-takken-topics.mjs --import <文件>
```

`TakkenTopicsView.vue` 直接渲染这些数据、**没有运行时校验兜底**，所以脚本和服务器都做了严格的结构检查——校验不通过会报错、不写入，正常情况下不用担心把页面写坏。

输入结构：

```json
{
  "id": "唯一字符串id",
  "tag": "大科目・小主题（或不属于单一科目就用自定义短语，会归到\"其他\"分类）",
  "title": { "zh": "中文标题", "ja": "日文标题（可选）" },
  "source": "来源说明（可以是具体题号，也可以是\"个人复习笔记\"这类描述）",
  "sections": [
    {
      "heading": "小节标题",
      "blocks": [
        { "type": "text", "content": { "zh": "……" } },
        { "type": "mnemonic", "content": { "zh": "记忆口诀……" } },
        { "type": "trap", "content": { "zh": "易错提醒……" } },
        { "type": "list", "style": "unordered", "items": [{ "zh": "……" }] },
        {
          "type": "table",
          "headers": [{ "zh": "列1" }, { "zh": "列2" }],
          "rows": [[{ "zh": "格子1" }, { "zh": "格子2" }]]
        }
      ]
    }
  ]
}
```

- 5 种 `block` 类型：`text`（正文）、`list`（列表）、`table`（表格，每行格子数必须等于表头列数；表头和格子允许为空）、`mnemonic`（记忆口诀，绿色高亮）、`trap`（易错提醒，红色高亮）。
- 按 `id` 覆盖，规则同错题。
- `tag` 如果不是「大科目」或已知子分类关键词，会自动落入「其他」分类——这是正常兜底，不是报错。

### `examSprint`：考前冲刺专项标记

考点速查里绝大多数条目本来就带 `trap` 区块（易错提醒），所以「有没有 trap 区块」筛不出什么，不能拿它当"考前冲刺"的判断标准。真正适合考前快速过一遍的，是**浓缩总结型**条目（数字陷阱汇总表、文字/逻辑陷阱汇总、反复出错清单、多题关联考点网络），跟"一题一个知识点"的普通条目性质不一样。

给这类条目加 `"examSprint": true`（跟 `id`/`tag` 同级），它就会出现在 `/tools/takken-notes?sprint=1`（页面顶部"🔥 考前冲刺专项"按钮）这个专门筛出来的列表里。普通的单题知识点条目不要加。

## 四、备份：把数据库导出成 JSON

```bash
cd frontend
node scripts/export-takken.mjs      # 只需要 TAKKEN_API_URL，读取是公开的
```

会把数据库当前全部内容写回 `src/data/takken-questions.json` 和 `takken-topics.json`（逐字保留原始 JSON，只在 `timesReported > 1` 时写出该字段）。想在 git 里留一份快照时执行一次再提交即可；宝塔自带的数据库备份是另一层保险。这两个 JSON 同时也是「恢复」用的：出问题时用 `--import` 把它们导回数据库。

### 种子 SQL 文件（首次部署 / 一键恢复）

```bash
cd frontend
npm run takken:seed        # 由两个 JSON 备份生成 server/seed/takken-seed.sql
```

生成的 `server/seed/takken-seed.sql` 是一个普通 SQL 文件（建表 + 全部错题和考点），在**宝塔「数据库 → 导入」**里上传即可，不需要令牌和脚本。**只补缺的、绝不覆盖**：数据库里已有的 `id` 完全不动（不覆盖内容、不改 `times_reported`），所以数据库是唯一的数据源，种子只是快照，怎么导入都不会冲掉数据库里的修改。要用 JSON 强制覆盖数据库里的条目，用 `upsert-takken-*.mjs --import`。想让种子反映数据库最新内容，先 `npm run takken:export` 再 `npm run takken:seed`，然后提交这两个 JSON 和 SQL 文件。

## 五、常见问题

- **脚本报 `Missing TAKKEN_API_URL`**：还没配置 `frontend/.env.takken`，见第一节。
- **报 `Missing or invalid token`**：令牌和服务器 `.env` 里的 `TAKKEN_ADMIN_TOKEN` 不一致；服务器没设置该变量时接口是只读的（返回 503）。
- **网站提示「题库加载失败」**：API 容器没起来或连不上数据库。在服务器上 `docker compose ps` 看 `sunrise-takken-api` 是否 healthy，`docker compose logs takken-api` 看原因。
- **网站是空的但脚本写入成功**：确认写入的是线上地址（`TAKKEN_API_URL`），而不是本地开发用的地址。

## 六、代码/页面的改动怎么上线

只有**改了代码、页面、样式**（不是加内容）才需要提交推送并部署：

```bash
git status --short && git diff --stat     # 提交前先看清这次到底改了哪些文件
git add <你改的文件>
git commit -m "简要描述"
git push origin main
```

服务器上更新（完整说明见根目录 `README.md`「在服务器上更新部署」）：

```bash
cd /www/wwwroot/sunrise-diagnoisi   # 服务器上实际的项目目录
bash scripts/deploy.sh
```

这一步只能由能连上服务器的人执行，AI 会话没有服务器访问权限，不要尝试代替执行——给出命令即可，由人来跑。
