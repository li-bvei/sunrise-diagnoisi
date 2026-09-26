# SUNRISE 项目交接文档

这里是项目的 AI / 开发交接入口。先读本目录，再按任务需要进入源码和根目录的维护文档。

## 推荐阅读顺序

1. [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md)：当前项目状态、架构、数据、测试、部署和未完成事项。
2. [`CHANGE_RECOMMENDATIONS.md`](./CHANGE_RECOMMENDATIONS.md)：按优先级整理的代码、产品、ERM 和上线修改建议。
3. [`../DEVELOPMENT.md`](../DEVELOPMENT.md)：较详细的业务规则、数据边界和维护约束；其中部分旧计划仍需以后续代码为准。
4. [`../SUBDIRECTORY_DEPLOYMENT.md`](../SUBDIRECTORY_DEPLOYMENT.md)：子目录部署说明；当前已知与 Vite 配置存在不一致，不能单独作为事实来源。
5. [`../frontend/src/data/universities/README.md`](../frontend/src/data/universities/README.md)：大学名单数据的生成、别名和复核规则。
6. [`TAKKEN_DATA_WORKFLOW.md`](./TAKKEN_DATA_WORKFLOW.md)：宅建错题库/考点速查怎么加内容、怎么上传部署——改这两份数据前必读，不要直接整份读取 JSON。

## 文档事实来源优先级

当文档和代码不一致时，按以下顺序判断：

1. 当前工作区源码和测试；
2. 当前构建产物与配置；
3. `README.md`、`DEVELOPMENT.md` 中与当前代码一致的部分；
4. 本目录中的计划性建议。

不要把“建议”“未来计划”当成已经实现的功能。涉及入管、税务、社保、年金的结果必须同时核对官方来源、规则版本和人工审查要求。

## 本次整理范围

2026-09-26 的整理：对照当前 `main`（`ab48e5c`）重写了 `PROJECT_HANDOFF.md` 的事实部分（路由、财务工具、数据量、测试与构建数字、部署与 `base` 路径、Git 工作流、已知缺陷、协作约定），保留并标注了“咨询留资方案（尚未实现）”附录；修正了 `README.md` 里关于 `VITE_BASE_PATH` 的错误表述；给 `CHANGE_RECOMMENDATIONS.md` 加了逐条现状表。

文档快照日期：2026-09-26（Asia/Tokyo）。`CHANGE_RECOMMENDATIONS.md` 正文仍是 2026-09-06 的建议，以其顶部的现状表为准。
