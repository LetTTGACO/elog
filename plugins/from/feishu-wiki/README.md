# @elog/plugin-from-feishu-wiki

Elog 1.0 的飞书知识库来源插件。它遍历指定 Wiki 的目录树，下载其中的飞书文档，并转换为
带目录信息的 Markdown `DocDetail`。

## 安装

```bash
pnpm add @elog/plugin-from-feishu-wiki
```

## 准备飞书应用

使用前需要创建飞书自建应用，取得 `appId` 与 `appSecret`，为应用开通读取知识库、文档和
文档资源所需的权限，并确保应用可以访问目标 Wiki。

还需要取得：

- `wikiId`：目标知识库 ID。
- `folderToken`：可选，只同步知识库中的指定子树。

## 基本配置

```ts
import { defineConfig } from '@elog/core';
import fromFeishuWiki from '@elog/plugin-from-feishu-wiki';
import imageLocal from '@elog/plugin-transform-image-local';
import toLocal from '@elog/plugin-to-local';

export default defineConfig({
  from: fromFeishuWiki({
    appId: process.env.FEISHU_APP_ID,
    appSecret: process.env.FEISHU_APP_SECRET,
    wikiId: process.env.FEISHU_WIKI_ID,
    folderToken: process.env.FEISHU_WIKI_FOLDER_TOKEN,
    disableParentDoc: true,
  }),
  plugins: [
    imageLocal({
      outputDir: 'images',
      prefixKey: '../images',
    }),
  ],
  to: toLocal({
    outputDir: 'docs',
    keepToc: true,
    frontMatter: { enable: true },
  }),
});
```

凭证建议保存在 env 文件中，并通过 `elog sync --env <file>` 显式加载。

## 配置项

| 配置               | 类型      | 默认值          | 说明                                      |
| ------------------ | --------- | --------------- | ----------------------------------------- |
| `appId`            | `string`  | —               | 飞书应用 App ID，必填                     |
| `appSecret`        | `string`  | —               | 飞书应用 App Secret，必填                 |
| `wikiId`           | `string`  | —               | 知识库 ID，必填                           |
| `folderToken`      | `string`  | `undefined`     | 只读取指定知识库节点下的内容              |
| `disableParentDoc` | `boolean` | `false`         | 不下载仍包含子节点的父级文档              |
| `baseUrl`          | `string`  | 飞书 SDK 默认值 | 自定义飞书 API 地址                       |
| `limit`            | `number`  | `10`            | 并发下载文档详情的数量                    |

缓存开关和缓存文件路径属于工作流配置，应写在 `defineConfig()` 顶层。

## 输出行为

- 遍历 Wiki 中的 `doc` 和 `docx` 节点，目录顺序由知识库树决定。
- 正文转换为 Markdown，并设置 `bodyType: 'markdown'`。
- 文档开头的 YAML Front Matter 会从正文移除并合并到 `properties`。
- 自动生成 `title`、`urlname`、`date` 和 `updated` 属性。
- Wiki 父级路径写入 `docStructure`，可配合 `toLocal({ keepToc: true })` 使用。
- 文档列表会与工作流缓存比较，只下载新增、更新或上次失败的文档。

飞书正文中的图片资源会先下载并转换为 Data URL。多数发布平台不适合长期使用 Base64 图片，
因此通常应在部署前增加一个图片转换插件，并把它放在 Markdown-to-HTML 等正文转换插件之前。

## 运行要求

- Elog 1.0
- Node.js 22.13.0 或更高版本
- 仅支持 ESM

## 相关链接

- [Elog 仓库](https://github.com/LetTTGACO/elog)
- [报告问题](https://github.com/LetTTGACO/elog/issues)
