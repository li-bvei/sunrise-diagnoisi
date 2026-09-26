# `/server/` 子目录部署适配说明

> 本文描述子目录部署的实现方式，与当前代码一致（2026-09-26 起 `VITE_BASE_PATH` 真正生效）。整体交接信息见 [`docs/PROJECT_HANDOFF.md`](docs/PROJECT_HANDOFF.md)。

## 目标

项目需要同时支持两种访问方式：

| 环境 | 访问地址 | 应用基路径 |
| --- | --- | --- |
| 本地开发 | `http://localhost:5173/` | `/` |
| 生产部署（默认） | `https://www.sunrise-nskt.com/server/` | `/server/` |
| 生产部署（根路径 / 其他子路径） | 自定义 | 由 `VITE_BASE_PATH` 指定 |

子目录适配只涉及 Vite 构建基路径和 Vue Router history 基路径，不涉及业务逻辑或页面内容。

## 1. Vite 构建基路径

涉及文件：

- `frontend/vite.config.ts`
- `frontend/vite.base-path.ts`（取值与校验逻辑，有单元测试 `frontend/tests/deploy-config.test.mjs`）

`vite.config.ts`：

```ts
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { resolveBasePath } from './vite.base-path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: resolveBasePath(env.VITE_BASE_PATH, mode === 'production'),
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
```

取值规则（`resolveBasePath`）：

| `VITE_BASE_PATH` | 生产构建 `base` | 开发 `base` |
| --- | --- | --- |
| 未设置 / 空 | `/server/`（默认，与线上一致） | `/` |
| `/` | `/` | `/` |
| `/server`、`/server/` | `/server/` | `/server/` |
| `/app/v2` | `/app/v2/` | `/app/v2/` |
| `server`、网址、含 `..`/空格/`?` | **构建失败并报错** | **报错** |

要点：

- 执行 `npm run dev` 时不设变量，`base` 为 `/`；执行 `npm run build` 时不设变量，`base` 为 `/server/`。
- 变量既可来自 shell / Docker 构建参数，也可来自 `frontend/.env*`；Docker 部署时由根目录 `.env` → `docker-compose.yml` 的 build arg → `frontend/Dockerfile` 传入。三处默认值都是 `/server/`，改其中一处的默认值必须同步其余两处（测试会检查）。
- 非法值直接让构建失败，因为错误的 `base` 不会报错，只会在浏览器里白屏。
- 生产构建生成的 JavaScript、CSS 及由 Vite 管理的资源地址会自动带上该前缀。

默认构建后的 `dist/index.html` 资源引用形式类似：

```html
<script type="module" crossorigin src="/server/assets/index-[hash].js"></script>
<link rel="stylesheet" crossorigin href="/server/assets/index-[hash].css">
```

这里没有在业务组件中手动拼接 `/server/`，因此不会产生 `/server/server/`。

## 2. Vue Router 基路径

修改文件：

`frontend/src/router/index.ts`

最终写法：

```ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // routes...
})
```

关键改动：

```ts
history: createWebHistory(import.meta.env.BASE_URL)
```

`import.meta.env.BASE_URL` 由 Vite 根据当前 `base` 自动注入：

| 环境 | `import.meta.env.BASE_URL` |
| --- | --- |
| 本地开发 | `/` |
| 生产构建（默认） | `/server/` |
| 生产构建（`VITE_BASE_PATH=/`） | `/` |

因此 Vue Router 会自动得到正确的 history 根路径：

- 本地路由：`/tools/highly-skilled`
- 生产路由：`/server/tools/highly-skilled`

没有使用下面两种写法：

```ts
createWebHistory()
```

```ts
createWebHistory('/server/')
```

第一种不能明确继承 Vite 的部署基路径；第二种会让本地开发也被固定到 `/server/`。

## 3. 为什么路由定义不需要增加 `/server/`

现有路由继续保持正常业务路径，例如：

```ts
{
  path: '/',
  component: PublicLayout,
  children: [
    {
      path: 'tools/highly-skilled',
      component: () => import('@/views/HighlySkilledView.vue'),
    },
  ],
}
```

不应改成：

```ts
path: '/server/tools/highly-skilled'
```

`/server/` 是应用部署基路径，由 Vite 和 Vue Router 统一处理，不属于业务路由本身。把它写入路由定义会造成环境耦合，并可能生成重复路径。

## 4. 静态资源和浏览器跳转检查

已检查以下可能破坏子目录部署的写法：

```text
/assets/...
/images/...
/logo...
/favicon...
window.location.href = '/...'
window.open('/...')
```

当前前端源码中没有发现需要修改的上述根路径硬编码，因此没有为了子目录部署额外改动页面组件。

项目中的页面跳转继续使用 Vue Router，例如：

```vue
<router-link to="/tools/j-skip">
  ...
</router-link>
```

Vue Router 会结合 `createWebHistory(import.meta.env.BASE_URL)` 自动生成包含生产基路径的实际 URL。

## 5. 最终运行结果

### 本地开发

```bash
cd frontend
npm run dev
```

访问：

```text
http://localhost:5173/
```

本地不需要、也不应该访问：

```text
http://localhost:5173/server/
```

### 生产构建

```bash
cd frontend
npm run build                      # 默认 /server/
VITE_BASE_PATH=/ npm run build     # 根路径
```

部署入口（默认）：

```text
https://www.sunrise-nskt.com/server/
```

服务器上部署仍是 `bash scripts/deploy.sh`；要换根路径，先在项目根目录 `.env` 写 `VITE_BASE_PATH=/`，并同步调整宿主机 Nginx 的 location（见 `README.md` 方式一）。

## 6. 未修改的部分

本次子目录适配没有修改：

- Docker 外部端口 `8090`
- `docker-compose.yml` 端口
- 容器名称
- Docker 内部 Nginx 配置
- 宝塔外层 Nginx 配置
- 高度人才积分计算
- 70分、80分判断
- J-Skip
- 永住诊断
- 大学名单
- 页面内容和样式
- 后端和数据库

总结：代码层面的子目录适配集中在 `frontend/vite.config.ts`（+ `vite.base-path.ts`）和 `frontend/src/router/index.ts`，Docker 侧的默认值在 `frontend/Dockerfile` 和 `docker-compose.yml`。
