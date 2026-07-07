# notion-to-halo

## 测试目的

这个 case 用来验证专用 Notion-Halo 测试数据库中的文档可以经过 Markdown-to-HTML transform 后部署到真实 Halo 站点。

## 覆盖范围

- `fromNotion` 可以读取专用于 Halo 部署链路的 Notion 测试数据库。
- `imageR2` 会先把 Notion 正文图片和属性中的 `cover` 替换成自有 R2 图床地址，避免 Halo 前台保留不可长期访问的 Notion 临时图片链接。
- `markdownToHtml` 会把 Markdown 文档转换成 Halo target 需要的 HTML body。
- `toHalo` 可以用 endpoint/token 完成真实部署。
- 第二次运行应命中无变化或跳过逻辑。

## Fixture 要求

- `ELOG_E2E_NOTION_HALO_DATABASE_ID` 指向专用于 Notion -> Halo 流程的稳定 Notion 测试数据库。
- Notion-Halo fixture 中的文章包含 `cover` 属性，用来验证属性图片也会被 R2 图床替换。
- `ELOG_E2E_HALO_ENDPOINT` 和 `ELOG_E2E_HALO_TOKEN` 指向可写入的 Halo 测试站点。
- R2 环境变量指向可写入的测试 bucket。
- Halo 站点中的测试文章允许被 e2e 创建或更新。

## 配置切换

这个 case 固定使用 R2 图床：

```ts
plugins: [imageR2(...), markdownToHtml()]
```

这样做是为了避免 Halo 前台保留 Notion 的临时或受限图片链接。不要在这个远端 CMS case 里使用本地图床：本地图床会生成本机相对路径，部署到 Halo 后前台通常无法访问。

运行这个 case 需要提供 `ELOG_E2E_R2_HOST`、`ELOG_E2E_R2_ACCESS_KEY_ID`、`ELOG_E2E_R2_SECRET_ACCESS_KEY`、`ELOG_E2E_R2_BUCKET`、`ELOG_E2E_R2_ENDPOINT`。R2 上传前缀在同一个文件的 `e2eProfile.image.prefixKey` 里配置。

## 不覆盖

- Halo 自身附件上传；`toHalo` 不再内置该路径，图片应在 transform 阶段处理。
- Notion catalog 目录输出。
