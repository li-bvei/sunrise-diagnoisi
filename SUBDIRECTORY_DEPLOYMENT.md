# `/server/` 子目录部署适配说明

## 目标

项目需要同时支持两种访问方式：

| 环境 | 访问地址 | 应用基路径 |
| --- | --- | --- |
| 本地开发 | `http://localhost:5173/` | `/` |
| 生产部署 | `https://www.sunrise-nskt.com/server/` | `/server/` |

本次子目录适配只涉及 Vite 构建基路径和 Vue Router history 基路径，没有修改业务逻辑或页面内容。

## 1. Vite 构建基路径

修改文件：

`frontend/vite.config.ts`

最终代码：

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/server/' : '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
```

关键改动：

```ts
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/server/' : '/',
}))
```

作用：

- 执行 `npm run dev` 时，Vite 使用 `development` 模式，`base` 为 `/`。
- 执行 `npm run build` 时，Vite 默认使用 `production` 模式，`base` 为 `/server/`。
- 生产构建生成的 JavaScript、CSS 及由 Vite 管理的资源地址会自动带上 `/server/` 前缀。

生产构建后的 `dist/index.html` 资源引用形式类似：

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
| 生产构建 | `/server/` |

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
npm run build
```

部署入口：

```text
https://www.sunrise-nskt.com/server/
```

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

总结：代码层面的子目录适配只有 `frontend/vite.config.ts` 和 `frontend/src/router/index.ts` 两处核心修改。
