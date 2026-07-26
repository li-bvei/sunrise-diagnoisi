# SUNRISE 专业诊断中心

面向 SUNRISE 客户公开使用的独立专业诊断前台。项目不接入原行政书士 ERP；目前已上线“高度人才积分计算”和独立的“特别高度人才J-Skip诊断”，其余工具陆续开放。

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
└─ DEVELOPMENT.md
```

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

容器端口仅绑定 `127.0.0.1:8090`，不会直接暴露到公网。建议在独立子域名的站点配置中，将 HTTPS 请求反向代理至：

```nginx
location / {
    proxy_pass http://127.0.0.1:8090;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

SSL 证书与 HTTPS 在宝塔或宿主机 Nginx 处理。

## 环境变量

| 变量 | 用途 |
| --- | --- |
| `VITE_APP_NAME` | 产品名称 |
| `VITE_DEFAULT_LOCALE` | 默认语言，支持 `zh-CN` / `ja-JP` |
| `VITE_API_BASE_URL` | 未来 Django API 基础路径 |
| `VITE_SUNRISE_OFFICIAL_URL` | SUNRISE 官网地址，为空时链接不可用 |
| `VITE_CONTACT_PHONE` | 联系电话，占位阶段建议保留 `06-XXXX-XXXX` |

不要提交真实 `.env`，不要在组件中硬编码服务器 IP、API 域名或生产域名。

## 路由

- `/`：首页
- `/tools`：全部工具
- `/tools/highly-skilled`：高度人才积分计算（可使用）
- `/tools/j-skip`：特别高度人才J-Skip独立基础判断（可使用、不计算积分）
- `/tools/permanent-residence`：永住申请条件诊断（即将上线）
- `/tools/highly-skilled-pr`：兼容旧地址，重定向到高度人才计算器
- `/guide`：使用说明
- `/privacy`：隐私政策占位
- `/terms`：使用条款占位
- `/disclaimer`：免责声明占位
- 其他路径：404 页面

Nginx 使用 `try_files $uri $uri/ /index.html` 支持 Vue Router history 模式刷新。

## 当前已完成

- 统一专业、克制、清晰的客户前台设计系统
- 中日双语完整切换，并使用 `localStorage` 保存语言
- 首页、工具中心、首个工具介绍、使用说明、政策占位与 404
- 9 个工具和 4 个业务分类的完整内容展示
- 高度人才与永住完全拆分为独立工具和路由
- 真实高度人才积分计算：1号イ、ロ、ハ、70分门槛、最低年收检查
- J-Skip 独立路由与独立基础条件判断，不显示积分合计
- 出生日期与诊断基准日精确年龄计算、通俗活动类型、细化学历与人工确认标记
- 基于根目录 `001335478.pdf` 全19页解析的2026年1月入管厅大学名单：390所学校、37个国家或地区
- 院校中英日文、常用简称和部分匹配检索；明确选择官方记录后自动加分，无匹配时转人工确认
- 75 所院校维护可靠或稳定通行中文名称，优先覆盖中国大陆、香港、台湾、澳门、新加坡、日本主要院校及部分欧美澳加名校；其余学校在中文界面降级显示 PDF 官方英文名称
- “日本高等教育机构学位”不再由用户重复勾选：系统根据正式学校记录、JP 国家代码、学历和“由该校正式授予学位”确认自动判断
- 按入管厅现行 Q&A 处理排除关系：日本大学学位与 N2 档日语能力不重复加分，N1 档不属于该排除项
- 结果改善建议、可版本化报告数据结构与报告预览
- 结果明确区分“确定分”“待确认分”“最高可能分”，并分别提示 70 / 80 分状态；研究成果、资格与复杂加分在证明审查前不会进入确定分
- 完整 A4 报告预览包含总分进度图、分类条形图、70/80 分状态、积分明细、共享建议、院校判断、证明/人工确认、官方依据与免责声明
- 日期显示统一为 `YYYY/MM/DD`，年收入按“日元/円”整数保存并提供千分位输入，相关职历按完整年输入
- 所有未开放工具统一显示“即将上线”，所有按钮与链接均有反馈
- 中文与日文分别使用独立字体栈，Element Plus 动态组件统一继承
- 桌面、笔记本、平板、手机响应式布局
- Docker 多阶段构建、Nginx 静态托管和健康检查

## 当前待开发

- 永住及其他 6 项工具的真实诊断表单与计算逻辑
- Django REST Framework API
- MySQL 数据库
- 客户资料与诊断记录保存
- 数据查看与使用量统计
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
- J-Skip 计算逻辑独立位于 `frontend/src/utils/jSkipCalculator.ts`
- 院校名单与名称匹配位于 `frontend/src/data/universities/`；仅选中PDF生成的390条官方记录才会自动加分
- `scripts/extract_official_universities.py` 可从根目录PDF重新生成 `officialUniversities.ts`

制度依据：

- [出入国在留管理厅：高度人才积分评价机制](https://www.moj.go.jp/isa/applications/resources/newimmiact_3_evaluate_index.html)
- [出入国在留管理厅：高度人才积分制度 Q&A](https://www.moj.go.jp/isa/applications/resources/newimmiact_3_qa.html)
- [出入国在留管理厅：特別高度人材制度 J-Skip](https://www.moj.go.jp/isa/applications/resources/nyuukokukanri01_00009.html)
- [出入国在留管理厅：积分项目证明资料基本示例](https://www.moj.go.jp/isa/content/001419077.pdf)
- [出入国在留管理厅：加分院校官方名单](https://www.moj.go.jp/isa/content/001335478.pdf)

计算结果是基于用户输入的机械计算，不替代活动符合性、基础就劳资格、证明材料或个案审查，也不构成许可保证。

## 自动化检查

```bash
cd frontend
npm test
```

测试先执行 TypeScript 类型检查，再检查 PDF 生成数据的 390 条完整性、名称规范化与 20 条结果限制、院校只计分一次、复杂项目待确认、日期与纯数字输入、帮助链接和报告结构。生产发布前仍应运行 `npm run build`。

## 院校数据版本与复核

`scripts/extract_official_universities.py` 会自动寻找根目录唯一的 `001335478*` 文件，读取全部页面，保留官方英文名、日文名、国家/地区、源文件、页码、生效年月与核对日。脚本会输出导入统计，并生成：

- `frontend/src/data/universities/officialUniversities.ts`：只含官方 PDF 记录；
- `scripts/output/university-import-review.json`：异常行、重复行和导入统计；
- `universityAliases.ts`：受控中文名及简称，不得创建资格记录。

人工名称按稳定学校 ID 保存在 `frontend/src/data/universities/universityAliases.ts`，与机械生成的 PDF 数据分离。每项记录显示名称、受控别名、可靠程度和核对日期；重新导入 PDF 不会覆盖它。无可靠中文名称时直接显示 `officialName` 和国家/地区，不生成机器翻译，也不影响英文/日文搜索、选择和加分。

学校字段表示“取得当前申报学历的毕业院校”。只有选择正式记录并确认该学历由该校授予时，系统才进行日本大学学位判断；自由输入学校名称不能触发加分。

报告预览中点击“打印 / 另存为PDF”，即可使用浏览器打印功能保存 PDF。打印样式使用 A4 纵向布局，隐藏导航、遮罩和操作按钮，并保留两类图表、积分明细、建议、院校判断和免责声明。

更新时先替换根目录 PDF，再使用包含 `pdfplumber` 的 Python 环境运行脚本。若出现未知国家、异常表格、重复记录或最终数量变化，脚本会停止，必须人工对照 PDF 后处理，禁止猜测。用 `--check` 可确认已提交数据可由当前 PDF 重现。
