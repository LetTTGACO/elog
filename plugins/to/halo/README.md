# @elog/plugin-to-halo

Elog 1.0 的 Halo 2 部署插件。它通过 Halo Console API 创建或更新文章、分类和标签，并同步
文章的发布状态。

## 安装

```bash
pnpm add @elog/plugin-to-halo
```

## 准备 Halo

在 Halo 后台创建有权管理文章、分类和标签的个人令牌，并准备站点根地址，例如
`https://blog.example.com`。

Halo 目标要求文档正文是 HTML。来源插件输出 Markdown 时，必须先使用
`@elog/plugin-transform-markdown-to-html`；图片转换应放在 Markdown-to-HTML 之前。

## 基本配置

```ts
import { defineConfig } from '@elog/core';
import fromNotion from '@elog/plugin-from-notion';
import imageR2 from '@elog/plugin-transform-image-r2';
import markdownToHtml from '@elog/plugin-transform-markdown-to-html';
import toHalo from '@elog/plugin-to-halo';

export default defineConfig({
  from: fromNotion({
    token: process.env.NOTION_TOKEN,
    dataSourceId: process.env.NOTION_DATA_SOURCE_ID,
  }),
  plugins: [
    imageR2({
      host: process.env.R2_PUBLIC_HOST,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      bucket: process.env.R2_BUCKET,
      endpoint: process.env.R2_ENDPOINT,
      propertyImageFields: ['cover'],
    }),
    markdownToHtml(),
  ],
  to: toHalo({
    endpoint: process.env.HALO_ENDPOINT,
    token: process.env.HALO_TOKEN,
  }),
});
```

令牌建议保存在 env 文件中，并通过 `elog sync --env <file>` 显式加载。

## 配置项

| 配置       | 类型     | 默认值 | 说明                         |
| ---------- | -------- | ------ | ---------------------------- |
| `endpoint` | `string` | —      | Halo 站点根地址，必填        |
| `token`    | `string` | —      | Halo 个人令牌，必填          |

`endpoint` 末尾可以包含 `/`，插件会在请求前将它移除。

## 文档输入契约

`bodyType` 必须是 `html`。未设置 `bodyType` 时按 Markdown 处理并拒绝部署，以避免把 Markdown
源码作为 HTML 发布。

下列 `properties` 会映射到 Halo 文章：

| 文档属性       | Halo 字段                  | 默认行为                         |
| -------------- | -------------------------- | -------------------------------- |
| `title`        | 文章标题                   | 必填                             |
| `urlname`      | Slug                       | 必填                             |
| `cover`        | 封面                       | 空                               |
| `excerpt`      | 摘要                       | 空                               |
| `autoExcerpt`  | 自动生成摘要               | `true`                           |
| `pinned`       | 置顶                       | `false`                          |
| `public`       | `PUBLIC` / `PRIVATE`       | `true`                           |
| `publish`      | 发布或下架                 | `true`                           |
| `date`         | 创建时间与发布时间         | 无效日期会跳过并警告             |
| `categories`   | 分类名称或名称数组         | 缺少的分类会尝试创建             |
| `tags`         | 标签名称或名称数组         | 缺少的标签会尝试创建             |

布尔属性可以使用布尔值，也可以使用字符串 `true` / `false`。

## 创建与更新

- 使用 `DocDetail.id` 作为 Halo 文章的稳定标识；已存在则更新，不存在则创建。
- `body` 作为渲染后的 HTML 内容。
- 存在 `rawBody` 时将其作为 Halo 可编辑原文，并使用 `rawBodyType`；否则使用 HTML 正文。
- 创建或更新成功后，根据 `publish` 调用发布或下架接口。
- 不会因为某篇文档未出现在本次同步中而删除 Halo 文章。
- 空文档列表会被视为部署错误；正常增量同步的无变化状态会在进入部署插件前跳过。

本插件不负责把正文图片上传到 Halo。部署远程站点前，应使用 R2、OSS、COS 等图片转换插件
生成可公开访问的绝对地址，不要保留本地相对路径或来源平台的临时图片 URL。

## 运行要求

- Elog 1.0
- Halo 2
- Node.js 22.13.0 或更高版本
- 仅支持 ESM

## 相关链接

- [Elog 仓库](https://github.com/LetTTGACO/elog)
- [报告问题](https://github.com/LetTTGACO/elog/issues)
