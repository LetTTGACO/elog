# yuque-pwd-to-local

## 测试目的

这个 case 用来验证语雀密码登录、语雀目录结构、本地图床 `pathFollowDoc`，以及本地 Markdown 部署能串成一个真实同步流程。

当前默认场景是：语雀 TOC Repo -> 本地图床 -> 本地 Markdown。

## 覆盖范围

- `fromYuque` 可以通过用户名、密码和 login 地址读取指定语雀知识库。
- `ELOG_E2E_YUQUE_REPO_TOC` 指向带目录结构的语雀测试知识库。
- `toLocal.keepToc` 会根据语雀目录信息生成嵌套文档目录。
- `imageLocal.pathFollowDoc` 会根据文档所在目录计算图片相对路径。
- 第二次运行应命中无变化或跳过逻辑。

## Fixture 要求

- 语雀测试知识库至少保留一篇嵌套目录文档。
- 至少一篇嵌套目录文档应包含图片，用来覆盖 `pathFollowDoc` 的相对路径计算。
- 密码登录环境变量必须指向可访问该知识库的测试账号。

## 配置切换

图床切换点在 `tests/e2e/cases/yuque-pwd-to-local/elog.config.ts` 的 `e2eProfile.image`：

```ts
image: imageProfiles.local,
```

要关闭图床，改成：

```ts
image: imageProfiles.none,
```

要切到某个云图床，改成对应 profile：

```ts
image: imageProfiles.r2,
```

可选值包括 `local`、`b2`、`cos`、`github`、`oss`、`qiniu`、`r2`、`upyun`、`none`。`case.ts` 会根据 `e2eProfile.image.kind` 自动追加对应图床环境变量；这些环境变量定义在 `tests/e2e/src/helpers/image-expected.ts` 的 `requiredEnvByImageKind`。

如果切到云图床，上传前缀默认来自同一个文件里的：

```ts
const cloudPrefixKey = 'elog-e2e/yuque-pwd/';
```

要只改某一个云图床的前缀，编辑对应 `imageProfiles.<kind>.prefixKey`。如果保持本地图床，不要给 `imageProfiles.local` 加 `prefixKey`，因为当前测试依赖 `pathFollowDoc` 动态计算嵌套目录中的相对图片路径。

**可以直接改**

- `e2eProfile.image`: 可以在 `imageProfiles.local`、`b2`、`cos`、`github`、`oss`、`qiniu`、`r2`、`upyun`、`none` 之间切换。`case.ts` 会根据这里的 `kind` 自动追加对应图床环境变量。
- `imageProfiles.local.outputDir`: 可以改成本地图床输出目录，例如 `images`、`assets`。现有断言会按这个值重新计算 Markdown 图片链接前缀。
- 云图床 profile 的 `prefixKey`: 可以改上传前缀。当前统一用 `cloudPrefixKey = 'elog-e2e/yuque-pwd/'`，也可以给某个云图床单独写值。
- 云图床插件里的可选字段，例如 `host`、`branch`、`region`: 可以按对应插件能力和环境变量调整。
- `cacheFile`: 可以改缓存文件名，`case.ts` 读取 `e2eProfile.cacheFile`，会跟着变。

**有约束地改**

- `docOutputDir`: 可以改，但必须继续同时用于 `pathFollowDoc.docOutputDir` 和 `toLocal({ outputDir })`。
- `pathFollowDoc.docOutputDir`: 必须和 `toLocal({ outputDir })` 指向同一个文档输出目录，否则本地图床相对路径会按错误目录计算。
- `toLocal.keepToc`: 目前必须保持 `true`，否则不会生成嵌套目录，`pathFollowDoc` 的嵌套路径行为也测不到。
- `imageProfiles.local.pathFollowDoc.enable`: 当前本地图床断言依赖它为 `true`。如果关掉，需要同步删掉或改写 `case.ts` 里的路径断言。

**暂时不要改**

- `id: 'yuque-pwd-to-local'`: 需要和 case 目录、`ELOG_E2E_CASE` 选择逻辑保持一致。改它等同于重命名 case。
- `fromYuque({ repo })`: 这个 case 固定使用 `ELOG_E2E_YUQUE_REPO_TOC`，用来覆盖目录结构和 `pathFollowDoc` 行为。
- `fromYuque` 的登录环境变量：这里是密码登录 case，应保持 `ELOG_E2E_YUQUE_USERNAME`、`ELOG_E2E_YUQUE_PWD`、`ELOG_E2E_YUQUE_LOGIN`。
- 本地图床不要再加 `prefixKey`: 开启 `pathFollowDoc` 后，图片前缀应由文档所在目录到图片目录动态计算。

**加断言时**

- 本地图床相关断言放在 `case.ts`，优先基于 `e2eProfile.image` 判断是否启用。
- 云图床相关断言也应按 `image.kind` 分支写，避免切换图床后误伤其他模式。
- 如果新增必需环境变量，优先收进 `tests/e2e/src/helpers/image-expected.ts` 的 `requiredEnvByImageKind`。

## 不覆盖

- 语雀 Token 登录路径；它由 `yuque-token-to-local` 覆盖。
- Notion/FlowUs 的 catalog 字段。
- 云图床全矩阵的真实可用性；这里只通过 profile 保留可切换入口。
