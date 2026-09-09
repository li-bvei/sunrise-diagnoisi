# SUNRISE 项目交接文档

这里是项目的 AI / 开发交接入口。先读本目录，再按任务需要进入源码和根目录的维护文档。

## 推荐阅读顺序

1. [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md)：当前项目状态、架构、数据、测试、部署和未完成事项。
2. [`CHANGE_RECOMMENDATIONS.md`](./CHANGE_RECOMMENDATIONS.md)：按优先级整理的代码、产品、ERM 和上线修改建议。
3. [`../DEVELOPMENT.md`](../DEVELOPMENT.md)：较详细的业务规则、数据边界和维护约束；其中部分旧计划仍需以后续代码为准。
4. [`../SUBDIRECTORY_DEPLOYMENT.md`](../SUBDIRECTORY_DEPLOYMENT.md)：子目录部署说明；当前已知与 Vite 配置存在不一致，不能单独作为事实来源。
5. [`../frontend/src/data/universities/README.md`](../frontend/src/data/universities/README.md)：大学名单数据的生成、别名和复核规则。

## 文档事实来源优先级

当文档和代码不一致时，按以下顺序判断：

1. 当前工作区源码和测试；
2. 当前构建产物与配置；
3. `README.md`、`DEVELOPMENT.md` 中与当前代码一致的部分；
4. 本目录中的计划性建议。

不要把“建议”“未来计划”当成已经实现的功能。涉及入管、税务、社保、年金的结果必须同时核对官方来源、规则版本和人工审查要求。

## 本次整理范围

- 重新核对 Git 状态、远端基线、源码、路由、数据、测试、部署配置和现有 Markdown。
- 记录当前未提交修改，不覆盖、不回退用户已有工作。
- 将原先散落在 README、DEVELOPMENT 和部署说明中的项目事实、风险与下一步集中到本目录。

文档快照日期：2026-09-06（Asia/Tokyo）。
