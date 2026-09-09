# SUNRISE 专业诊断中心

面向 SUNRISE 客户公开使用的独立专业诊断前台。项目不接入原行政书士 ERP；当前前端提供 7 个工具（高度人才积分/J-Skip、永住条件、租房初期费用、工资社保与到手金额、役员报酬模拟、在日天数记录、宅建刷题），分 5 个业务分类。界面采用 Apple 风格设计系统。结果均应视为初步参考，不替代个案审查。

## 技术栈

- Vue 3 + Composition API
- TypeScript 严格模式
- Vite
- Vue Router（history 模式）
- Pinia
- Element Plus / Element Plus Icons
- Axios（仅预留依赖，当前不发起 API 请求）
- Nginx + Docker

## 项目目录

```text
sunrise-diagnosis/
├─ frontend/
│  ├─ src/
│  │  ├─ components/   公共组件
│  │  ├─ data/         双语文案与工具数据
│  │  ├─ layouts/      公共前台布局
│  │  ├─ router/       路由
│  │  ├─ stores/       Pinia 状态
│  │  ├─ styles/       主题与响应式样式
│  │  ├─ types/        TypeScript 类型
│  │  ├─ utils/        图标映射与诊断计算规则
│  │  └─ views/        页面
│  ├─ Dockerfile
│  └─ package.json
├─ nginx/default.conf
├─ docker-compose.yml
├─ .env.example
├─ docs/               AI 交接与修改建议
└─ DEVELOPMENT.md
```

## 项目交接与修改建议

面向 AI 或新成员的统一交接入口位于 [`docs/README.md`](docs/README.md)。建议先阅读：

1. [`docs/PROJECT_HANDOFF.md`](docs/PROJECT_HANDOFF.md)：当前代码、数据、测试、部署和未完成事项；
2. [`docs/CHANGE_RECOMMENDATIONS.md`](docs/CHANGE_RECOMMENDATIONS.md)：按优先级整理的修复建议、产品优化和 ERM 演进路线。

这两个文件记录的是项目当前快照和建议，不替代源码、测试及官方制度来源。

## 本地开发

首次运行前复制环境变量：

```bash
copy .env.example frontend\.env
cd frontend
npm install
npm run dev
```

macOS/Linux 可使用 `cp .env.example frontend/.env`。默认开发地址为 `http://localhost:5173`。

## 生产构建

```bash
cd frontend
npm run build
```

构建结果位于 `frontend/dist`。

## Docker 启动与停止

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f --tail=100
```

停止：

```bash
docker compose down
```

Docker 预览地址为 `http://127.0.0.1:8090`。Node 仅在多阶段构建的第一阶段运行，生产容器由 Nginx 静态托管。

## 宝塔 / 宿主机 Nginx 反向代理

容器端口仅绑定 `127.0.0.1:8090`，不会直接暴露到公网。

### 方式一：独立子域名（根路径）

站点配置将 HTTPS 请求反向代理至：

```nginx
location / {
    proxy_pass http://127.0.0.1:8090;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

此时前端按默认根路径 `/` 构建，无需额外配置。

### 方式二：共用域名下的子路径（如 `/server/`）

如果域名根路径已被其他站点占用，只能把本项目挂在子路径下（例如 `/server/`），反向代理规则形如：

```nginx
location ^~ /server/ {
    proxy_pass http://127.0.0.1:8090/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

`proxy_pass`末尾的斜杠会让宿主机 Nginx 在转发前去掉 `/server/` 前缀，容器收到的请求路径与根路径部署时完全一致。但浏览器加载的静态资源地址（JS/CSS）如果仍按根路径 `/assets/...` 构建，会因为不带 `/server/` 前缀而被宿主机路由到域名根路径的其他站点，导致白屏或资源 404。

此时必须让前端构建也带上 `/server/` 前缀：在**项目根目录**（与 `docker-compose.yml` 同级，不是 `frontend/.env`）新建 `.env` 文件：

```bash
VITE_BASE_PATH=/server/
```

再执行 `docker compose up -d --build` 重新构建。`docker-compose.yml` 会把 `VITE_BASE_PATH` 作为构建参数传入 `frontend/Dockerfile`，`vite.config.ts` 据此设置 Vite 的 `base`，前端资源路径和 Vue Router 的历史模式基准路径都会自动带上该前缀；容器自身的 Nginx 配置和健康检查不需要改动。如果之后子路径改变或恢复为根路径部署，把该值改掉或删除该 `.env` 文件后重新构建即可。

SSL 证书与 HTTPS 在宝塔或宿主机 Nginx 处理。

## 环境变量

| 变量 | 用途 |
| --- | --- |
| `VITE_APP_NAME` | 产品名称 |
| `VITE_DEFAULT_LOCALE` | 默认语言，支持 `zh-CN` / `ja-JP` |
| `VITE_API_BASE_URL` | 未来 Django API 基础路径 |
| `VITE_SUNRISE_OFFICIAL_URL` | SUNRISE 官网地址，为空时链接不可用 |
| `VITE_CONTACT_PHONE` | 联系电话 |
| `VITE_CONTACT_ADDRESS` | 联系地址 |

不要提交真实 `.env`，不要在组件中硬编码服务器 IP、API 域名或生产域名。

## 路由

- `/`：首页
- `/tools`：全部工具
- `/tools/highly-skilled`：高度人才积分计算（可使用，结果页包含独立的J-Skip基础判断）
- `/tools/permanent-residence`：永住申请条件诊断（可使用）
- `/tools/rental-cost`：租房初期费用诊断（可使用）
- `/tools/salary`：工资、社保与到手金额（含标准报酬等级，自动概算住民税）
- `/tools/executive-compensation`：役员报酬模拟（含法人税等概算与税后留存利润，赤字如实显示）
- `/tools/stay-days`：在日天数与出入境记录
- `/tools/takken`、`/tools/takken-notes`、`/tools/takken-analysis`：宅建刷题、考点速查与薄弱分析
- `/tools/highly-skilled-pr`、`/tools/j-skip`：兼容旧地址，重定向到高度人才计算器
- `/tools/payroll`、`/tools/standard-remuneration`：兼容旧地址，重定向到 `/tools/salary`
- `/tools/pension`：已下线，重定向到 `/tools`（旧年金简易估算可靠性不足，暂时移除）
- `/guide`：使用说明
- `/privacy`：隐私政策占位
- `/terms`：使用条款占位
- `/disclaimer`：免责声明占位
- 其他路径：404 页面

Nginx 使用 `try_files $uri $uri/ /index.html` 支持 Vue Router history 模式刷新。

## 当前已完成

- Apple 风格设计系统：SF/系统字体栈、克制的中性色板、大圆角与轻投影、全圆角按钮、精简的页面信息（去掉多余的 eyebrow、状态标签与说明横幅），Element Plus 组件统一继承
- 中日双语完整切换，并使用 `localStorage` 保存语言
- 首页、工具中心、使用说明、政策占位与 404
- 7 个工具和 5 个业务分类；工具分类数量由 `frontend/src/data/tools.ts` 自动计算
- 高度人才、永住与租房初期费用完全拆分为独立工具和路由
- 工资、社保与到手金额：由月额报酬同时给出员工到手、到手比例、公司实际雇佣成本、健康保险/厚生年金等级与临界区间；住民税按标准控除自动概算，可手动调整
- 役员报酬模拟：多方案比较个人到手、公司社保负担、法人税等（法人税/地方法人税/法人住民税/事业税・特别法人事业税的标准税率概算）与税后留存利润；亏损时如实显示赤字与均等割，不再截为 0
- 真实高度人才积分计算：1号イ、ロ、ハ、70分门槛、最低年收检查
- J-Skip 基础条件判断已合并至高度人才积分计算结果页，复用同一表单输入，作为独立展示区块、不显示积分合计
- 永住申请条件诊断：覆盖一般永住、日本人/永住者/特别永住者配偶者与实子、定住者、高度人才、特别高度人才J-Skip 共6条路径的在留年限与素行、独立生计、公共义务、最长在留期间、无罚金/拘禁刑等基础条件机械判断
- 出生日期与诊断基准日精确年龄计算、通俗活动类型、细化学历与人工确认标记
- 基于根目录 `001335478.pdf` 全19页解析的2026年1月入管厅大学名单：390所学校、37个国家或地区
- 院校中英日文、常用简称和部分匹配检索；明确选择官方记录后自动加分，无匹配时转人工确认
- 390 所院校全部提供中文显示名称：保留 75 所可靠或稳定通行中文名称，其余 315 所使用可继续人工校正的机器译名；PDF `officialName`、稳定学校 ID 和计分匹配均保持不变
- “日本高等教育机构学位”恢复为独立手动勾选；学校国家、学校切换和院校名单匹配都不会自动修改该选项，原学位授予确认字段已删除
- 按入管厅现行 Q&A 处理排除关系：日本大学学位与 N2 档日语能力不重复加分，N1 档不属于该排除项
- 结果改善建议、可版本化报告数据结构与报告预览
- 高度人才结果展示当前输入对应的预计总分、逐项积分明细、70 / 80 分状态和 J-Skip 独立判断；结果仍需结合证明材料和个案审查
- 完整 A4 报告预览包含总分进度图、分类条形图、70/80 分状态、精简积分明细、共享建议、院校判断与免责声明；不再显示官方依据、证明项目和人工确认区块
- 结果页与报告的积分明细统一只显示项目、分数和状态
- 日期输入值统一为 `YYYY/MM/DD`，日历月份强制使用 `1月` 至 `12月` 的阿拉伯数字；年收入页面按“万日元/万円”输入，计算层仍保存日元整数
- 租房初期费用诊断：13 项预设费用（敷金、礼金、保证金、仲介手续费、保证公司利用料、火灾保险、钥匙更换费、当月/次月房租、当月/次月管理费、清扫费、契约事务手续费）+ 8 项预设材料清单，均为勾选后手动输入金额，支持自定义追加项目，当月房租提供按天折算的参考值供一键填入，生成类似高度人才积分诊断的可打印报告
- 工具元数据、兼容旧路由和中日双语入口已统一维护，所有按钮与链接均应有反馈
- 中文与日文分别使用独立字体栈，Element Plus 动态组件统一继承
- 桌面、笔记本、平板、手机响应式布局
- Docker 多阶段构建、Nginx 静态托管和健康检查

## 当前待开发

- 工资与役员报酬工具仍为标准税率概算：未覆盖配偶/扶养控除、繰越欠损金、税额控除、外形标准课税、消费税与自治体超过课税，正式方案仍需人工复核
- 年金估算工具已下线，未来如需重做应基于完整的再评价率与个人履历数据，而非单一系数
- Django REST Framework API
- MySQL 数据库
- 客户资料与诊断记录保存（含结果页后置的可选咨询留资，取代早期表单前置收集姓名电话的设计）
- 数据查看与使用量统计（当前 `frontend/src/utils/analytics.ts` 仅在开发环境打点、不落地，接入后端后再持久化）
- 正式隐私政策、使用条款、联系方式与官网地址

## 后续 Django / MySQL 建议结构

后续可在项目根目录新增独立 `backend/`，并在 Compose 中增加 `api` 与 `db` 服务。前端继续只访问 `/api`，由宿主机或容器 Nginx 转发至 Django。后端按 `accounts`、`diagnoses`、`tools` 等业务域拆分，诊断规则使用可版本化的数据结构，避免与原 ERP 数据耦合。

## 高度人才计算规则

计算逻辑位于 `frontend/src/utils/highlySkilledCalculator.ts`，规则版本为 `2026-07`。覆盖：

- 高度学术研究活动（高度専門職1号イ）
- 高度专业技术活动（高度専門職1号ロ）
- 高度经营管理活动（高度専門職1号ハ）
- 学历、相关职历、预计年收、年龄、研究成果、国家资格、经营职位
- 日语能力、日本高等教育机构学位、指定大学、创新机构等常见官方加分
- 70 分积分门槛与1号イ/ロ最低年收基准提示
- J-Skip 判断规则独立位于 `frontend/src/utils/jSkipCalculator.ts`，在本页复用同一表单输入并作为独立区块展示，不并入积分合计
- 院校名单与名称匹配位于 `frontend/src/data/universities/`；仅选中PDF生成的390条官方记录才会自动加分
- `scripts/extract_official_universities.py` 可从根目录PDF重新生成 `officialUniversities.ts`

制度依据：

- [出入国在留管理厅：高度人才积分评价机制](https://www.moj.go.jp/isa/applications/resources/newimmiact_3_evaluate_index.html)
- [出入国在留管理厅：高度人才积分制度 Q&A](https://www.moj.go.jp/isa/applications/resources/newimmiact_3_qa.html)
- [出入国在留管理厅：特別高度人材制度 J-Skip](https://www.moj.go.jp/isa/applications/resources/nyuukokukanri01_00009.html)
- [出入国在留管理厅：积分项目证明资料基本示例](https://www.moj.go.jp/isa/content/001419077.pdf)
- [出入国在留管理厅：加分院校官方名单](https://www.moj.go.jp/isa/content/001335478.pdf)

计算结果是基于用户输入的机械计算，不替代活动符合性、基础就劳资格、证明材料或个案审查，也不构成许可保证。

## 永住申请条件计算规则

计算逻辑位于 `frontend/src/utils/permanentResidenceCalculator.ts`，规则版本为 `2026-07`，依据 2026年2月24日改订的《永住许可に関するガイドライン》。覆盖6条路径：

- 一般永住（技术・人文知识・国际业务、经营管理等就劳或居住资格）：连续在留10年，其中以就劳/居住资格（不含技能实习、特定技能1号）连续在留满5年
- 日本人・永住者・特别永住者的配偶者：实质婚姻生活持续满3年，且连续在留满1年
- 日本人・永住者・特别永住者的实子：连续在留满1年
- 定住者：以定住者资格连续在留满5年
- 高度人才：积分70分以上连续3年，或80分以上连续1年（与高度人才积分计算工具的70/80分门槛对应，但不共用同一次计算结果，由用户自行申报所处积分区间与年限）
- 特别高度人才J-Skip：连续在留满1年

所有路径均需满足：公共义务履行（纳税、养老金、医疗保险、入管法申报）、无罚金刑或拘禁刑记录、现有在留资格为该类别下最长在留期间；素行善良与独立生计仅在配偶者/实子路径下依法免除。

制度依据：

- [出入国在留管理厅：永住许可に関するガイドライン（令和8年2月24日改订）](https://www.moj.go.jp/isa/applications/resources/nyukan_nyukan50.html)
- [出入国在留管理厅：永住许可申请](https://www.moj.go.jp/isa/applications/procedures/16-4.html)
- [出入国在留管理厅：高度人才永住在留年限缓和措施](https://www.moj.go.jp/isa/applications/procedures/nyuukokukanri07_00131.html)

计算结果是基于用户输入的机械判断，不代表入管厅最终审查结果；永住许可需综合审查证明材料与个案情况，不构成许可保证。

## 租房初期费用清单规则

本工具不做公式推算，而是让工作人员按房源实际收费项目逐项勾选、直接填写金额，生成一份可交给客户查看的费用与材料清单（类似高度人才积分诊断的报告导出）。类型定义在 `frontend/src/types/rentalCost.ts`，标签/说明文案与报告生成逻辑在 `frontend/src/utils/rentalCostCalculator.ts`，报告展示组件为 `frontend/src/components/rental-cost/RentalCostReportView.vue`。规则版本为 `RENTAL_COST_RULES_VERSION`（当前 `2026-08`），仅用于标记文案/项目清单的版本，不涉及计算公式。

- 费用项目固定 13 项预设（敷金、礼金、保证金、仲介手续费、保证公司利用料、火灾保险、钥匙更换费、当月/次月房租、当月/次月管理费、清扫费、契约事务手续费），每项自带一句固定中日双语说明；未勾选的项目不出现在报告里，也不计入合计
- 每个费用项目的金额均由用户直接输入，不做房租倍数或百分比推算；唯一例外是“当月房租”——如果填写了每月房租和入住日期，会按当月实际天数（`daysInMonth`）算出一个日割参考金额显示在旁边，用户点击“填入参考值”才会带入输入框，不点击则保持空白，且填入后仍可手动改成实际金额
- 支持在清单外自由添加自定义费用项目（项目名称 + 金额）
- 材料清单同样是固定 8 项预设（在留卡/护照、住民票、收入证明、印章、印鉴登录证明书、证件照、紧急联系人/保证人信息、银行账户信息）+ 自定义追加，只勾选、不需要金额
- 报告不包含免责声明区块（按业务要求移除）；报告顶部只在填写了房租或入住日期时才显示对应信息

维护本清单时：

1. 新增/调整预设费用或材料项目，需要同时改 `RENTAL_COST_ITEM_KEYS`/`RENTAL_MATERIAL_KEYS`（类型定义）和对应的双语标签/说明文案（`rentalCostCalculator.ts` 里的 `ITEM_TEXT`/`MATERIAL_TEXT`）；
2. 改动会影响已生成的历史 PDF 的字段口径，调整前先确认是否需要同步更新 `RENTAL_COST_RULES_VERSION`；
3. 日割参考值只是建议值，不得改成强制计算或自动覆盖用户已填的金额；
4. 同步更新中日文说明与本节。

报告内容完全来自用户输入和勾选，不代表具体物件的官方收费标准；敷金、礼金、中介手续费、保证公司费率等均由房东、中介公司或保证公司自行制定，正式金额以签约文件为准。

## 自动化检查

```bash
cd frontend
npm test
```

测试先执行 TypeScript 类型检查，再检查 PDF 生成数据的 390 条完整性、75/315 中文名称分层、全量中英文搜索、稳定 ID、日本学位手动选择与 N2 排除、万元收入转换和档位、日期数字本地化、报告及积分明细精简。生产发布前仍应运行 `npm run build`。

## 院校数据版本与复核

`scripts/extract_official_universities.py` 会自动寻找根目录唯一的 `001335478*` 文件，读取全部页面，保留官方英文名、日文名、国家/地区、源文件、页码、生效年月与核对日。脚本会输出导入统计，并生成：

- `frontend/src/data/universities/officialUniversities.ts`：只含官方 PDF 记录；
- `scripts/output/university-import-review.json`：异常行、重复行和导入统计；
- `universityAliases.ts`：75 所受控中文名及简称，不得创建资格记录；
- `machineTranslatedNames.ts`：其余 315 所中文机器译名，仅用于显示和搜索。

人工名称按稳定学校 ID 保存在 `frontend/src/data/universities/universityAliases.ts`，机器译名保存在 `frontend/src/data/universities/machineTranslatedNames.ts`，两者均与机械生成的 PDF 数据分离，重新导入 PDF 不会覆盖。需要修正机器译名时，将确认后的名称迁入 `universityAliases.ts` 并把状态改为 `verified` 或 `common-name`，同时从机器译名文件移除同一 ID。

学校查询只负责官方大学名单加分。只有选中 390 条正式记录之一才能触发院校名单加分；自由输入学校名称不能触发加分，也不会影响独立的日本高等教育机构学位勾选。

报告预览中点击“打印 / 另存为PDF”，即可使用浏览器打印功能保存 PDF。打印样式使用 A4 纵向布局，隐藏导航、遮罩和操作按钮，并保留两类图表、三列积分明细、建议、院校判断和免责声明。

更新时先替换根目录 PDF，再使用包含 `pdfplumber` 的 Python 环境运行脚本。若出现未知国家、异常表格、重复记录或最终数量变化，脚本会停止，必须人工对照 PDF 后处理，禁止猜测。用 `--check` 可确认已提交数据可由当前 PDF 重现。
