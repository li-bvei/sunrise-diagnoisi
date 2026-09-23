# 宅建刷题数据维护指南

给人类和 AI 会话看的操作手册：怎么往宅建模块（错题库 + 考点速查）里加内容、加完怎么上传部署。目标是让任何人或任何一次新开的 AI 对话，不用重新摸索就能照着做。

## 给 AI 会话的第一条规则

**永远不要用 Read / `cat` 之类的工具去读整份 `takken-questions.json` 或 `takken-topics.json`。** 这两个文件已经有上百条日文原文+中文解析，体量在 100KB 以上；CJK 文字很吃 token，整份读进来会占掉当次对话相当大比例的上下文，而这跟本次要做的事（加一两条内容）完全不成比例。

正确做法是本文档第三、四节介绍的两个脚本——它们在自己的 Node 进程里完成读取、合并、写回，你只需要提供新增/修改的内容本身，永远不需要看到已有的其他条目。

## 一、数据在哪里

| 内容 | 文件 | 对应页面 | 类型定义 |
|---|---|---|---|
| 错题库（每一题都是真实做错过的原题） | `frontend/src/data/takken-questions.json` | `/tools/takken` 刷题练习 | `TakkenQuestion`（`frontend/src/types/takken.ts`） |
| 考点速查（复习参考资料：数字陷阱、文字陷阱、易错清单等） | `frontend/src/data/takken-topics.json` | `/tools/takken-notes` 考点速查 | `TakkenTopic`（`frontend/src/types/takken.ts`） |

两份数据条目数会经常变化（正在持续录入中），不要在文档或对话里假设固定数字；需要确认当前有多少条时用下面这种命令现查，不要猜：

```bash
cd frontend
python3 -c "import json; print(len(json.load(open('src/data/takken-questions.json', encoding='utf-8'))))"
python3 -c "import json; print(len(json.load(open('src/data/takken-topics.json', encoding='utf-8'))))"
```

**判断新内容该放哪个文件**：真实考过、做错过的原题（有题干+4个选项+唯一正确答案）→ 题库；不是某一道具体考题、而是总结/对比/口诀/易错清单这类参考资料 → 考点速查。

## 二、错题怎么加——`upsert-takken-questions.mjs`

```bash
cd frontend
node scripts/upsert-takken-questions.mjs <题目.json>       # 从文件写入
cat 题目.json | node scripts/upsert-takken-questions.mjs   # 从 stdin 写入（配合 heredoc 很好用）
node scripts/upsert-takken-questions.mjs --dry-run <文件>  # 只校验，不写入
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
- `options` / `correct`：4 个选项 + 正确答案下标（0 开始）。也支持新版 `options: [{id,text,explainZh}]` + `correctOptionId` 的写法，但手写新题用上面这种简单写法就够了。
- 按 `id` 覆盖写入：已存在的 `id` 会被替换（用于修正内容），新 `id` 会被追加。

### 「重点关注」机制（`timesReported`）

如果同一道题（同一个 `id`）被重复提交，脚本会自动把 `timesReported` 计数 +1，不需要手动传这个字段。计数 ≥ 2 时，这道题会在刷题卡片、选题面板、薄弱分析页自动高亮成「🔥 重点关注」——语义是「这道题被真实反复记录做错，不是新题偶尔错一次」。只有明确是同一题又错了一次才重新提交它的 `id`；单纯改错别字不需要额外说明，脚本行为一样（覆盖+计数仍会 +1，如需保留原计数可在输入里显式传 `timesReported` 覆盖）。

## 三、考点速查怎么加——`upsert-takken-topics.mjs`

```bash
cd frontend
node scripts/upsert-takken-topics.mjs <考点.json>
cat 考点.json | node scripts/upsert-takken-topics.mjs
node scripts/upsert-takken-topics.mjs --dry-run <文件>
```

`TakkenTopicsView.vue` 是直接把 JSON 强制类型转换成 `TakkenTopic[]` 使用的，**没有运行时校验兜底**，所以这个脚本本身做了比较严格的结构检查——校验不通过会直接报错、不落盘，正常情况下不用担心把页面写坏。

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

- 5 种 `block` 类型：`text`（正文）、`list`（列表）、`table`（表格，每行格子数必须等于表头列数）、`mnemonic`（记忆口诀，绿色高亮）、`trap`（易错提醒，红色高亮）。
- 按 `id` 覆盖写入，规则同题库脚本。
- `tag` 如果不是「大科目」或已知子分类关键词，会自动落入「其他」分类——这是正常兜底，不是报错。

### `examSprint`：考前冲刺专项标记

考点速查里绝大多数条目本来就带 `trap` 区块（易错提醒），所以「有没有 trap 区块」筛不出什么——不能拿它当"考前冲刺"的判断标准。真正适合考前快速过一遍的，是那种**一条顶多条**的浓缩总结型条目（数字陷阱汇总表、文字/逻辑陷阱汇总、反复出错清单、多题关联考点网络），跟"一题一个知识点"的普通条目性质不一样。

给这类条目加 `"examSprint": true` 字段（跟 `id`/`tag` 同级），它就会出现在 `/tools/takken-notes?sprint=1`（页面顶部"🔥 考前冲刺专项"按钮）这个专门筛出来的列表里。普通的单题知识点条目不要加这个字段。

## 四、提交前务必先看一眼改了什么

这两个脚本、以及可能同时在别的窗口/AI 对话里操作同一份文件的其他人，都会直接改这两个 JSON。**`git add` 之前一定要 `git diff --stat` 看一眼，确认这次改动的范围和你以为的一致**，避免把别处刚好同时写入的内容也一起打包进自己的提交、却没意识到：

```bash
git status --short
git diff --stat -- frontend/src/data/takken-questions.json frontend/src/data/takken-topics.json
```

## 五、上传到 GitHub

本项目单人维护，约定是直接提交到 `main`（不开分支）：

```bash
git add frontend/src/data/takken-questions.json frontend/src/data/takken-topics.json
# 如果本次还改了脚本/组件/样式等代码，一并加进来
git commit -m "简要描述这次加了什么"
git push origin main
```

## 六、部署到服务器

数据/代码只有推送到 GitHub 还不会自动上线，需要在服务器上拉取并重新构建。完整说明见根目录 [`README.md`](../README.md) 的「在服务器上更新部署」一节；日常最简单的方式是登录服务器后跑一键脚本：

```bash
cd /www/wwwroot/sunrise-diagnoisi   # 服务器上实际的项目目录
bash scripts/deploy.sh
```

这一步只能由能连上服务器的人执行，AI 会话没有服务器访问权限，不要尝试代替执行——给出命令即可，由人来跑。
