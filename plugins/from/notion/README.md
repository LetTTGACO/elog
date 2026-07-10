# @elog/plugin-from-notion

Elog 1.0 的 Notion 来源插件。它从 Notion data source 下载页面，将页面属性转换为文档属性，
并将正文转换为 Markdown `DocDetail` 交给后续转换和部署插件。

## 安装

```bash
pnpm add @elog/plugin-from-notion
```

## 准备 Notion

使用前需要：

1. 创建一个 Notion Integration 并取得 Token。
2. 将需要同步的数据库或 data source 授权给该 Integration。
3. 取得 `dataSourceId`；旧配置也可以继续提供 `databaseId`。

推荐直接使用 `dataSourceId`。使用 `databaseId` 时，插件会读取数据库并选择其中第一个可用的
data source。

## 基本配置

下面的工作流从 Notion 下载文档，并通过 `@elog/plugin-to-local` 写入本地 `docs` 目录：

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
    frontMatter: { enable: true },
  }),
});
```

将凭证保存在不会提交到版本库的 env 文件中：

```dotenv
NOTION_TOKEN=secret_xxx
NOTION_DATA_SOURCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

显式指定 env 文件并运行同步：

```bash
pnpm exec elog sync --env .env
```

## 配置项

| 配置           | 类型                                           | 默认值      | 说明                                                    |
| -------------- | ---------------------------------------------- | ----------- | ------------------------------------------------------- |
| `token`        | `string`                                       | —           | Notion Integration Token，必填                          |
| `dataSourceId` | `string`                                       | —           | 推荐使用的 Notion data source ID                        |
| `databaseId`   | `string`                                       | —           | 兼容旧配置；与 `dataSourceId` 至少提供一个               |
| `filter`       | `boolean \| object`                            | `undefined` | 查询过滤条件；`true` 使用内置的“已发布”过滤              |
| `sorts`        | `boolean \| string \| NotionSort[]`           | `undefined` | 查询排序条件                                             |
| `catalog`      | `boolean \| { enable: boolean; property?: string }` | `undefined` | 从 Select 或 Multi-select 属性生成目录结构               |
| `imgToBase64`  | `boolean`                                      | `false`     | 下载时将正文图片转换为 Base64                            |
| `limit`        | `number`                                       | `10`        | 并发下载页面详情的数量                                   |

`token` 和 `dataSourceId` / `databaseId` 会在运行时检查。缓存开关和缓存文件路径属于工作流配置，
应写在 `defineConfig()` 顶层，而不是作为 Notion 查询选项使用。

### 过滤

- `filter: false` 或不设置：不增加过滤条件。
- `filter: true`：只查询 `status` 属性为 Select 且值等于 `已发布` 的页面。
- `filter: { ... }`：将对象作为 Notion data source 查询过滤条件传入。

### 排序

- `sorts: false` 或不设置：不增加排序条件。
- `sorts: true`：按创建时间降序排列。
- 支持 `dateDesc`、`dateAsc`、`sortDesc`、`sortAsc`、`createTimeDesc`、
  `createTimeAsc`、`updateTimeDesc` 和 `updateTimeAsc` 预设值。
- 也可以传入 `{ property, direction }[]`，其中 `direction` 为 `ascending` 或
  `descending`。

### 目录

```ts
fromNotion({
  token: process.env.NOTION_TOKEN,
  dataSourceId: process.env.NOTION_DATA_SOURCE_ID,
  catalog: {
    enable: true,
    property: 'catalog',
  },
});
```

目录字段必须是 Notion Select 或 Multi-select。Select 生成一层目录，Multi-select 按选项顺序
生成多层目录。配合 `toLocal({ keepToc: true })` 可以按照该结构创建本地目录。

## 输出行为

- 正文输出为 Markdown，并设置 `bodyType: 'markdown'`。
- Notion 页面属性会转换为普通 JavaScript 值。
- Title 属性会映射到 `properties.title`。
- 缺少 `urlname` 时使用页面 ID，缺少 `date` 或 `updated` 时使用页面时间。
- 文档列表与工作流缓存比较，只下载新增、更新或上次同步失败的页面。

Notion 图片地址可能是临时或受限地址。需要长期保存图片时，建议在工作流中增加图片转换插件。
`imgToBase64` 并不适合所有 Markdown 渲染器，启用前请确认目标平台支持。

## 运行要求

- Elog 1.0
- Node.js 22.13.0 或更高版本
- 仅支持 ESM

## 相关链接

- [Elog 仓库](https://github.com/LetTTGACO/elog)
- [报告问题](https://github.com/LetTTGACO/elog/issues)
