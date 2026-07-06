# notion-to-wordpress

## 测试目的

这个 case 用来保留 Notion 到 WordPress 的真实部署回归覆盖。WordPress 当前不在稳定发布矩阵中，这个 case 更偏手动验收和兼容性观察。

## 覆盖范围

- `fromNotion` 可以读取基础 Notion 测试数据库。
- `markdownToHtml` 会把 Markdown 文档转换成 WordPress target 需要的 HTML body。
- `toWordPress` 可以用 endpoint/username/password 完成真实部署。
- 第二次运行应命中无变化或跳过逻辑。

## Fixture 要求

- `ELOG_E2E_NOTION_DATABASE_ID` 指向稳定的基础 Notion 测试数据库。
- WordPress 环境变量指向可写入的测试站点。
- 测试站点中的文章允许被 e2e 创建或更新。

## 配置切换

这个 case 默认 `e2eProfile.image.kind` 是 `none`，只测 Notion -> Markdown-to-HTML -> WordPress 基础部署。

如果要临时加图床 transform，编辑 `tests/e2e/cases/notion-to-wordpress/elog.config.ts` 里的 `e2eProfile.image`：

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

选择 R2 时，需要提供 `ELOG_E2E_R2_HOST`、`ELOG_E2E_R2_ACCESS_KEY_ID`、`ELOG_E2E_R2_SECRET_ACCESS_KEY`、`ELOG_E2E_R2_BUCKET`、`ELOG_E2E_R2_ENDPOINT`。这里的图床 transform 发生在部署前；WordPress 自身媒体上传仍然由 `toWordPress({ enableUploadImage })` 控制，当前固定为 `false`。

## 不覆盖

- WordPress 发布矩阵或 npm 发布资格。
- WordPress 图片上传，当前配置固定 `enableUploadImage: false`。
- Notion catalog 目录输出。
