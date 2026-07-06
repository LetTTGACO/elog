# notion-catalog-to-local

## 测试目的

这个 case 用来验证 Notion 数据库中的 `catalog` 字段可以被转换成文档目录结构，并由本地部署按目录生成 Markdown。它对应 VitePress 这类按文件夹渲染目录的使用场景。

## 覆盖范围

- `fromNotion.catalog` 使用 `{ enable: true, property: 'catalog' }` 读取目录字段。
- 单选 catalog 可以生成一层目录。
- 多选 catalog 可以按标签顺序生成多级目录。
- `toLocal.keepToc` 会根据 `docStructure` 创建嵌套目录。
- `imageLocal.pathFollowDoc` 会根据文档所在目录计算图片相对路径。
- 第二次运行应命中无变化或跳过逻辑。

## Fixture 要求

- `ELOG_E2E_NOTION_CATALOG_DATABASE_ID` 指向专门的 catalog 测试数据库。
- 数据库必须包含 `catalog` 属性，类型应为 Select 或 Multi-select。
- 至少保留一篇单层目录文档和一篇多级目录文档。
- 至少一篇文档应包含图片，用来覆盖本地图床输出。

## 配置切换

这个 case 当前固定使用本地图床和 `pathFollowDoc`，不提供图床 profile 切换入口。这样做是为了把测试焦点固定在 Notion catalog -> `docStructure` -> `toLocal.keepToc` 的目录输出链路上。

如果要改 catalog 字段名，编辑 `tests/e2e/cases/notion-catalog-to-local/elog.config.ts` 里的 `e2eProfile.catalogProperty`，并确保 Notion 测试数据库里存在同名 Select 或 Multi-select 属性。

如果要改文档输出目录，必须同时保持这些值一致：

- `e2eProfile.docOutputDir`
- `e2eProfile.image.pathFollowDoc.docOutputDir`
- `toLocal({ outputDir })`

## 不覆盖

- 普通 Notion 到本地的基础 smoke 路径；它由 `notion-to-local` 覆盖。
- 自定义 catalog 属性名以外的目录来源。
- 非 local 部署平台的目录渲染行为。
