# notion-to-halo

## 测试目的

这个 case 用来验证专用 Notion-Halo 测试数据库中的文档可以经过 Markdown-to-HTML transform 后部署到真实 Halo 站点。

## 覆盖范围

- `fromNotion` 可以读取专用于 Halo 部署链路的 Notion 测试数据库。
- `imageR2` 会先把 Notion 正文图片和属性中的 `cover` 替换成自有 R2 图床地址，避免 Halo 前台保留不可长期访问的 Notion 临时图片链接。
- `markdownToHtml` 会把 Markdown 文档转换成 Halo target 需要的 HTML body。
- `toHalo` 可以用 endpoint/token 完成真实部署。
- 第二次运行应命中无变化或跳过逻辑。
- 从 Halo 回读每篇文章的标题、slug、cover、原始 Markdown 和 HTML，检查正文图片及 cover 的 R2 域名和上传前缀，确认 Markdown 图片在 HTML 中保留。
- 检查文章已发布，草稿与发布快照一致，发布正文与草稿正文一致。
- 向其中一篇 Notion 测试文章追加临时段落，再次同步后回读 Halo，确认同一篇文章生成新快照，草稿和发布正文都包含变更。
- 在 `finally` 中删除临时段落并再次同步，回读确认 Halo 的草稿和发布正文已移除临时内容。

## Fixture 要求

- `ELOG_E2E_NOTION_HALO_DATABASE_ID` 指向专用于 Notion -> Halo 流程的稳定 Notion 测试数据库。
- Notion integration 需要具备读取、插入和更新内容的权限，以便追加和删除临时段落。
- Notion-Halo fixture 至少包含一张正文图片和一个 `cover` 属性，文章应允许发布。
- `ELOG_E2E_HALO_ENDPOINT` 和 `ELOG_E2E_HALO_TOKEN` 指向可读写文章及正文的 Halo 测试站点。
- R2 环境变量指向可写入的测试 bucket。
- Halo 站点中的测试文章允许被 e2e 创建或更新。

Notion 的编辑时间精确到分钟。重复运行时，测试可能等待下一分钟再追加段落，以验证真实的增量同步；恢复时仅把临时 workspace 中该文章的缓存编辑时间设为 `0`，确保同一分钟内删除的临时段落也会同步到 Halo。

## 配置切换

这个 case 固定使用 R2 图床：

```ts
plugins: [imageR2(...)]
to: toHalo({ ..., plugins: [markdownToHtml()] })
```

这样做是为了避免 Halo 前台保留 Notion 的临时或受限图片链接。不要在这个远端 CMS case 里使用本地图床：本地图床会生成本机相对路径，部署到 Halo 后前台通常无法访问。

运行这个 case 需要提供 `ELOG_E2E_R2_HOST`、`ELOG_E2E_R2_ACCESS_KEY_ID`、`ELOG_E2E_R2_SECRET_ACCESS_KEY`、`ELOG_E2E_R2_BUCKET`、`ELOG_E2E_R2_ENDPOINT`。R2 上传前缀在同一个文件的 `e2eProfile.image.prefixKey` 里配置。

## 不覆盖

- Halo 自身附件上传；`toHalo` 不再内置该路径，图片应在 transform 阶段处理。
- Notion catalog 目录输出。
