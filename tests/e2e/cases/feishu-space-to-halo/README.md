# feishu-space-to-halo

## 测试目的

验证飞书空间下载的文档，经 R2 图床和 Markdown-to-HTML 转换后，可以部署并发布到真实 Halo。

## 覆盖范围

- 第一次运行同步文档，第二次运行检查无变化跳过。
- 复用 Halo 回读断言，逐篇检查文章 ID、标题、slug、cover、原始 Markdown 和 HTML。
- 正文图片使用配置的 R2 域名和上传前缀，Markdown 图片在 HTML 中保留。
- 文章已发布，草稿与发布快照及正文一致。
- 当前 fixture 没有 cover，检查 Halo cover 为空；来源包含 cover 时，同样校验它的值及 R2 地址。

## Fixture 要求

- 复用 `feishu-space-r2-to-local` 的测试目录，提供 `ELOG_E2E_FEISHU_APP_ID`、`ELOG_E2E_FEISHU_APP_SECRET`、`ELOG_E2E_FEISHU_SPACE_FOLDER_TOKEN`；可选 `ELOG_E2E_FEISHU_BASE_URL`。
- 测试文档至少包含一张正文图片，文章应允许发布。
- 提供 `ELOG_E2E_HALO_ENDPOINT`、`ELOG_E2E_HALO_TOKEN`，允许读取、创建、更新和发布这些测试文章。
- 提供 R2 的 host、access key、secret、bucket、endpoint。变量名称见 [E2E README](../../README.md)。

## 运行与配置

在 `tests/e2e` 中运行 `pnpm test:feishu-space-halo`；也包含在 `pnpm test:stable` 中。

配置位于 `elog.config.ts`，固定使用 `imageR2`，并在 Halo target 上配置 `markdownToHtml`。R2 上传前缀由 `e2eProfile.image.prefixKey` 指定，当前为 `elog-e2e/feishu-space/`，与飞书空间本地部署用例共用测试图片。

Halo 文章 ID 使用来源文档 ID，多次运行会更新同一组测试文章。
