# feishu-space-r2-to-local

## 测试目的

这个 case 用来验证飞书 Space 文件夹下载、R2 图床替换，以及本地 Markdown 部署能串成一个真实同步流程。

## 覆盖范围

- `fromFeishuSpace` 可以通过应用凭据读取指定 Space 文件夹下的文档。
- `imageR2` 会把文档图片上传到 R2，并把 Markdown 中的图片地址替换成 `ELOG_E2E_R2_HOST` 下的地址。
- `toLocal` 会生成本地 Markdown，并保留文档目录结构。
- 第二次运行应命中无变化或跳过逻辑。

## Fixture 要求

- `ELOG_E2E_FEISHU_SPACE_FOLDER_TOKEN` 指向一个稳定的 Space 文件夹。
- 文件夹中至少保留一篇可下载文档。
- 至少一篇文档应包含图片，否则 R2 地址替换断言无法覆盖真实图床路径。

## 不覆盖

- 飞书 Wiki 下载路径。
- 本地图床路径计算。
- R2 以外的云图床插件。
