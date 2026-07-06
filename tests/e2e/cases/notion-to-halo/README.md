# notion-to-halo

## 测试目的

这个 case 用来验证 Notion 文档可以经过 Markdown-to-HTML transform 后部署到真实 Halo 站点。

## 覆盖范围

- `fromNotion` 可以读取基础 Notion 测试数据库。
- `markdownToHtml` 会把 Markdown 文档转换成 Halo target 需要的 HTML body。
- `toHalo` 可以用 endpoint/token 完成真实部署。
- 第二次运行应命中无变化或跳过逻辑。

## Fixture 要求

- `ELOG_E2E_NOTION_DATABASE_ID` 指向稳定的基础 Notion 测试数据库。
- `ELOG_E2E_HALO_ENDPOINT` 和 `ELOG_E2E_HALO_TOKEN` 指向可写入的 Halo 测试站点。
- Halo 站点中的测试文章允许被 e2e 创建或更新。

## 配置切换

这个 case 默认 `e2eProfile.image.kind` 是 `none`，只测 Notion -> Markdown-to-HTML -> Halo 基础部署。

如果要临时加图床 transform，编辑 `tests/e2e/cases/notion-to-halo/elog.config.ts` 里的 `e2eProfile.image`：

```ts
image: {
  kind: 'local',
  outputDir: 'images',
  prefixKey: '../images',
  expectFiles: true,
}
```

或改成 R2：

```ts
image: {
  kind: 'r2',
}
```

选择 R2 时，需要提供 `ELOG_E2E_R2_HOST`、`ELOG_E2E_R2_ACCESS_KEY_ID`、`ELOG_E2E_R2_SECRET_ACCESS_KEY`、`ELOG_E2E_R2_BUCKET`、`ELOG_E2E_R2_ENDPOINT`。这里的图床 transform 发生在部署前；Halo 自身附件上传仍然由 `toHalo({ enableUploadImage })` 控制，当前固定为 `false`。

## 不覆盖

- Halo 图片上传，当前配置固定 `enableUploadImage: false`。
- Halo 存储策略和分组参数；这些由插件单测覆盖。
- Notion catalog 目录输出。
