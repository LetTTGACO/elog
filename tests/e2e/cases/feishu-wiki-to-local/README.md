# feishu-wiki-to-local

## 测试目的

这个 case 用来验证飞书 Wiki 下载、本地图床替换，以及本地 Markdown 部署的基础链路。

## 覆盖范围

- `fromFeishuWiki` 可以通过应用凭据读取指定 Wiki。
- `disableParentDoc: true` 下不会把父级目录节点当正文文档下载。
- `imageLocal` 会把图片写入本地 `images` 目录，并避免生成重复扩展名的图片文件。
- `toLocal.keepToc` 会根据 Wiki 目录信息生成嵌套文档目录。
- 第二次运行应命中无变化或跳过逻辑。

## Fixture 要求

- `ELOG_E2E_FEISHU_WIKI_ID` 指向一个稳定的 Wiki。
- Wiki 中至少保留一篇可下载文档。
- 至少一篇文档应包含图片，用来覆盖本地图床输出。

## 不覆盖

- 飞书 Space 文件夹下载路径。
- 云图床上传。
- `pathFollowDoc` 的相对图片路径计算。
