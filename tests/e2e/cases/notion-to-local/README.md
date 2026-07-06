# notion-to-local

## 测试目的

这个 case 是 Notion 下载到本地 Markdown 的基础 smoke 用例，用来确认最常见的本地部署链路可用。

## 覆盖范围

- `fromNotion` 可以读取基础 Notion 测试数据库。
- `catalog: false` 下文档会直接输出到本地目标目录。
- `imageLocal` 会把图片写入本地 `images` 目录并替换 Markdown 图片地址。
- `toLocal` 会生成带 Front Matter 的 Markdown。
- 第二次运行应命中无变化或跳过逻辑。

## Fixture 要求

- `ELOG_E2E_NOTION_DATABASE_ID` 指向稳定的基础 Notion 测试数据库。
- 数据库中至少保留一篇可下载文档。
- 至少一篇文档应包含图片，用来覆盖本地图床输出。

## 配置切换

图床切换点在 `tests/e2e/cases/notion-to-local/elog.config.ts` 的 `e2eProfile.image`。

默认使用本地图床：

```ts
image: imageProfiles.local,
```

如果要关闭图床 transform，改成：

```ts
image: imageProfiles.none,
```

如果要切到 R2，改成：

```ts
image: imageProfiles.r2,
```

选择 R2 时，需要提供 `ELOG_E2E_R2_HOST`、`ELOG_E2E_R2_ACCESS_KEY_ID`、`ELOG_E2E_R2_SECRET_ACCESS_KEY`、`ELOG_E2E_R2_BUCKET`、`ELOG_E2E_R2_ENDPOINT`。R2 上传前缀在同一个文件的 `imageProfiles.r2.prefixKey` 里配置。

## 不覆盖

- Notion catalog 目录字段；它由 `notion-catalog-to-local` 覆盖。
- Markdown-to-HTML transform。
- 远端部署平台。
