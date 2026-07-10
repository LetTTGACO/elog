# @elog/core

Elog 1.0 的配置与工作流运行时。它负责加载和校验配置、依次执行插件生命周期、协调缓存，
并向调用方返回结构化的工作流结果。

通常应通过 `@elog/cli` 使用 Core；需要把 Elog 嵌入 Node.js 程序时，也可以直接调用这里的
公开 API。

> Elog 1.0 目前处于 Beta 阶段，公开 API 仍可能在正式版前调整。

## 安装

```bash
pnpm add @elog/core
```

## 定义配置

```ts
import { defineConfig } from '@elog/core';
import fromNotion from '@elog/plugin-from-notion';
import toLocal from '@elog/plugin-to-local';

export default defineConfig({
  id: 'notion-to-local',
  cacheFilePath: 'elog.cache.json',
  from: fromNotion({
    token: process.env.NOTION_TOKEN,
    dataSourceId: process.env.NOTION_DATA_SOURCE_ID,
  }),
  to: toLocal({
    outputDir: 'docs',
  }),
});
```

`defineConfig()` 只提供类型约束和编辑器提示，不会在运行时修改配置。

## 工作流配置

| 配置             | 类型                     | 默认值            | 说明                                 |
| ---------------- | ------------------------ | ----------------- | ------------------------------------ |
| `id`             | `string`                 | `workflow-<序号>` | 工作流 ID                            |
| `disable`        | `boolean`                | `false`           | 跳过当前工作流                       |
| `from`           | `FromPlugin`             | —                 | 唯一的来源插件，必填                 |
| `plugins`        | `TransformPlugin[]`      | `[]`              | 按声明顺序执行的转换插件             |
| `to`             | `ToPlugin \| ToPlugin[]` | —                 | 一个或多个部署插件，必填             |
| `deployStrategy` | `serial \| parallel`     | `serial`          | 多个部署目标的执行方式               |
| `disableCache`   | `boolean`                | `false`           | 忽略已有缓存并强制全量同步           |
| `cacheFilePath`  | `string`                 | 见下文            | 缓存文件路径                         |

单工作流默认使用 `elog.cache.json`。多工作流配置默认依次使用 `elog.cache1.json`、
`elog.cache2.json` 等文件，避免彼此覆盖。多个工作流按配置顺序运行，并在第一个失败结果后停止。

## 程序化运行

### `sync()`

直接运行已经构造好的配置：

```ts
import { sync } from '@elog/core';
import config from './elog.config.js';

const results = await sync(config, { cwd: process.cwd() });

for (const result of results) {
  if (result.status === 'failed') {
    console.error(result.workflowId, result.error);
  }
}
```

`sync()` 不读取配置文件或 env 文件。配置无法识别或未通过校验时会抛出 `ElogConfigError`；
插件运行失败则收敛为 `status: 'failed'` 的工作流结果。

### `syncFromConfig()`

从磁盘加载配置后运行：

```ts
import { syncFromConfig } from '@elog/core';

const results = await syncFromConfig({
  cwd: process.cwd(),
  configFile: 'elog.config.ts',
  envFile: '.env',
  debug: true,
});
```

未指定 `configFile` 时会查找 `elog.config.ts`、`elog.config.js`、`elog.config.cjs` 和
`elog.config.mjs`。只有传入 `envFile` 时才会加载 env 文件。

## 工作流结果

每个工作流返回以下状态之一：

- `success`：同步、部署和缓存写入完成，并返回同步数量与缓存路径。
- `skipped`：工作流被禁用，或来源插件没有发现变化。
- `failed`：配置进入运行时后发生错误，并返回结构化 `ElogError`。

Core 不调用 `process.exit()`，也不负责终端展示或退出码。应用边界可以根据这些结果自行决定
日志、重试和进程状态；`@elog/cli` 已提供默认处理。

## 公开入口

- 配置：`defineConfig`、`loadConfigFromFile`、`resolveConfig`
- 运行：`sync`、`syncFromConfig`
- 错误：`ElogError`、`ElogConfigError`、`ElogPluginError`
- 类型：`ElogConfig`、`ResolveConfigResult`、`WorkflowResult`

插件契约、文档类型和 Context Helper 由 `@elog/plugin-sdk` 提供。

## 运行要求

- Node.js 22.13.0 或更高版本
- 本包为 ESM；配置加载同时支持 TS、JS、CJS 和 MJS

## 相关链接

- [Elog 仓库](https://github.com/LetTTGACO/elog)
- [报告问题](https://github.com/LetTTGACO/elog/issues)
