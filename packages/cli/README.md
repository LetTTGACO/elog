# @elog/cli

Elog 1.0 的命令行工具。它负责初始化配置、执行一次性导出，以及从配置文件运行完整的文档
同步工作流。

> Elog 1.0 目前处于 Beta 阶段，命令和生成的配置仍可能在正式版前调整。

## 安装

```bash
pnpm add -D @elog/cli
```

安装后通过项目内的 `elog` 命令运行：

```bash
pnpm exec elog --help
```

## 快速开始

在现有 Node.js 项目中运行初始化向导：

```bash
pnpm exec elog init
```

向导会选择来源、转换和部署插件，使用当前项目的包管理器安装 `@elog/core` 与所选插件，并
生成 `elog.config.ts`。如果配置文件已经存在，CLI 会在确认后先创建带时间戳的备份。

完成配置后运行同步：

```bash
pnpm exec elog sync
```

## 命令

| 命令          | 用途                                             |
| ------------- | ------------------------------------------------ |
| `elog init`   | 选择插件、安装依赖并生成配置文件                 |
| `elog export` | 不写配置和缓存，交互式执行一次完整导出           |
| `elog sync`   | 从配置文件运行一个或多个工作流                   |

### `elog init`

```bash
pnpm exec elog init [--name <config-file>] [--dry-run]
```

- `--name`：自定义生成的配置文件名，默认是 `elog.config.ts`。
- `--dry-run`：只预览安装命令和配置内容，不安装依赖、不写文件。

### `elog export`

```bash
pnpm exec elog export
```

`export` 会交互式选择一组来源、转换和部署插件，安装缺少的插件包并立即执行。该命令禁用
缓存读取和写入，适合不需要长期配置的一次性导出。

### `elog sync`

```bash
pnpm exec elog sync [--config <file>] [--env <file>] [--debug]
```

- `-c, --config`：指定配置文件。
- `-e, --env`：加载指定的 env 文件。
- `--debug`：输出调试日志。

未指定配置时，Elog 会查找 `elog.config.ts`、`elog.config.js`、`elog.config.cjs` 或
`elog.config.mjs`。env 文件不会自动加载；配置依赖 `.env` 时需要显式传入 `--env .env`，
并将该文件加入 `.gitignore`。

## 最小配置

```ts
import { defineConfig } from '@elog/core';
import fromNotion from '@elog/plugin-from-notion';
import toLocal from '@elog/plugin-to-local';

export default defineConfig({
  from: fromNotion({
    token: process.env.NOTION_TOKEN,
    dataSourceId: process.env.NOTION_DATA_SOURCE_ID,
  }),
  to: toLocal({
    outputDir: 'docs',
  }),
});
```

```bash
pnpm exec elog sync --env .env
```

工作流失败时 CLI 会输出结构化结果并设置非零退出码，便于在 CI 中直接判断同步是否成功。

## 运行要求

- Node.js 22.13.0 或更高版本
- CLI 与插件包为 ESM；配置加载同时支持 TS、JS、CJS 和 MJS

## 相关链接

- [Elog 仓库](https://github.com/LetTTGACO/elog)
- [报告问题](https://github.com/LetTTGACO/elog/issues)
