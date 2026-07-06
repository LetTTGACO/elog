# notion-to-local

## 测试目的

这个 case 是 Notion 下载到本地 Markdown 的基础 smoke 用例，默认通过 R2 图床替换图片，避免保留 Notion 临时或受限图片链接。

## 覆盖范围

- `fromNotion` 可以读取基础 Notion 测试数据库。
- 未启用 catalog 时文档会直接输出到本地目标目录。
- `imageR2` 会把图片上传到 R2，并替换 Markdown 图片地址。
- `toLocal` 会生成带 Front Matter 的 Markdown。
- 第二次运行应命中无变化或跳过逻辑。

## Fixture 要求

- `ELOG_E2E_NOTION_DATABASE_ID` 指向稳定的基础 Notion 测试数据库。
- 数据库中至少保留一篇可下载文档。
- 至少一篇文档应包含图片，用来覆盖 R2 图床替换。
- R2 环境变量指向可写入的测试 bucket。

## 配置切换

图床切换点在 `tests/e2e/cases/notion-to-local/elog.config.ts` 的 `e2eProfile.image`。

默认使用 R2 图床：

```ts
image: imageProfiles.r2,
```

如果要切到本地图床，改成：

```ts
image: imageProfiles.local,
```

运行默认 R2 profile 时，需要提供 `ELOG_E2E_R2_HOST`、`ELOG_E2E_R2_ACCESS_KEY_ID`、`ELOG_E2E_R2_SECRET_ACCESS_KEY`、`ELOG_E2E_R2_BUCKET`、`ELOG_E2E_R2_ENDPOINT`。R2 上传前缀在同一个文件的 `imageProfiles.r2.prefixKey` 里配置。

## 不覆盖

- Notion catalog 目录字段；它由 `notion-catalog-to-local` 覆盖。
- Markdown-to-HTML transform。
- 远端部署平台。
- 本地图床作为手动切换 profile 保留，不是默认覆盖路径。
