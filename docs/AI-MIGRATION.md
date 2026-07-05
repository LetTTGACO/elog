# Elog 0.x 到 1.0 AI 迁移手册

这份文档写给执行迁移的 AI。目标不是解释 Elog 的完整历史，而是让你在一个用户的 0.x 项目里，把支持范围内的配置迁移到 Elog 1.0。

## 给 AI 的第一原则

- 只迁移本文明确支持的路径：Notion / 语雀 Token / 语雀账号密码 / 飞书 -> Local -> 官方图片插件。
- 不要覆盖用户现有的 0.x 配置文件。新建 1.0 配置文件。
- 不要复制 `.env` 里的敏感值。只生成 env example，并提醒用户手动迁移。
- 用户旧配置里已有的 `process.env.X` 名称就是事实来源。不要为了贴合示例而改 ENV 名。
- 不要把多个 0.x 配置合并成一个 1.0 多工作流配置。本文只处理一对一迁移。
- 未知字段不要猜。先记录旧字段语义；必要时查 [LetTTGACO/elog](https://github.com/LetTTGACO/elog) 或询问用户。

## 迁移边界

支持：

- `write.platform: 'notion'`
- `write.platform: 'yuque'`
- `write.platform: 'yuque-pwd'`
- `write.platform: 'feishu'`
- `deploy.platform: 'local'`
- `image.platform`: `local`、`cos`、`oss`、`github`、`qiniu`、`upyun`、`r2`、`b2`

不支持作为本轮迁移目标：

- 来源：FlowUs、Wolai、Outline 或其他来源。
- 目标：Halo、WordPress、Confluence 或其他非 Local 目标。
- 0.x 命令能力：`clean`、`force`、`full-cache`、`upgrade`。
- Local 输出格式：`html`、`html-highlight`、`wiki`。
- 把多个 0.x config 合并成一个 1.0 多工作流 config。

## 推荐执行流程

1. 找到旧配置文件：通常是 `elog.config.js`、`elog.config.notion.js`、`elog.config.yuque-token.js` 这类文件。
2. 读取旧配置的 `write.platform`、`deploy.platform`、`image.enable`、`image.platform`。
3. 如果来源或目标不在迁移边界内，停止迁移并告诉用户该配置不在本文支持范围内。
4. 按“字段映射附录”把旧配置拆成 1.0 的 `from`、`plugins`、`to`。
5. 如果 `image.enable: false`，不要添加图片 transform 插件。
6. 如果 `image.enable: true`，按 `image.platform` 添加一个官方图片 transform 插件。
7. 如果旧配置用了 `formatExt`、`imagePathExt`、`secretExt`、`image.plugin`，先看“0.x 专用扩展点迁移”。
8. 新建 1.0 配置文件，不覆盖旧文件。
9. 生成 env example，只列变量名，不填真实密钥。
10. 运行一次配置检查或同步前 dry review：确认 import、字段、ENV 名、输出目录都来自旧配置。

## 文件生成规则

- 旧文件是 `elog.config.js` 时，优先新建 `elog.config.1x.ts`。
- 旧文件是 `elog.config.notion.js` 时，优先新建 `elog.config.notion.1x.ts`。
- 旧文件是 `elog.config.yuque-token.js` 时，优先新建 `elog.config.yuque-token.1x.ts`。
- 旧文件是 `elog.config.shorturl.js` 时，优先新建 `elog.config.shorturl.1x.ts`。
- 如果用户项目不方便使用 TypeScript config，可以新建 `.mjs`；但 1.0 推荐 ESM import 写法。
- 自定义 transform 插件建议放在 `elog.transforms.ts` 或 `elog.transform.<name>.ts`，再由新 config import。
- env example 建议命名为 `.env.elog.example`；如果项目已有同类文件，追加前先读最新版。

运行时让用户显式指定新配置：

```bash
elog sync -c elog.config.1x.ts
```

## 依赖迁移规则

1. 核心包使用 `@elog/cli`。
2. 生成依赖前先执行 `npm view @elog/cli version`，把返回的版本号写入
   `package.json`；不要凭记忆写版本号，也不要默认写成 `latest`。
3. 按实际用到的插件添加依赖，不要一次装全平台插件。
4. 如果字段映射附录没有覆盖到某个插件包名，以 [LetTTGACO/elog](https://github.com/LetTTGACO/elog) 最新实现为准。

生成依赖列表时按这条规则：

- 一定包含 `@elog/cli`。
- 按 `write.platform` 增加一个来源插件包。
- 一定包含 `@elog/plugin-to-local`。
- 仅当 `image.enable: true` 时，按 `image.platform` 增加一个图片插件包。
- 如果生成了用户专属本地 transform 文件，不需要为它添加 npm 依赖。

## ENV 迁移规则

保留旧 ENV 名。迁移时扫描旧配置中所有 `process.env.<NAME>`：

- 新配置继续使用同一个 `<NAME>`。
- env example 只写 `<NAME>=`。
- 不要根据本文、官方示例或变量命名偏好改名。
- 不要读取、复制或重写用户真实 `.env` 里的值。
- 最终提醒用户手动把敏感值迁移到新运行环境。

## 配置迁移方法

不要从本文复制一份固定配置给用户。你要根据用户自己的 0.x 配置生成一份新配置。

### 1. 找到用户正在使用的 0.x 配置

优先按运行入口找：

- 读 `package.json` scripts，查找 `elog sync`、`elog -c`、`elog sync -c`。
- 搜索 `elog.config` 命名的文件。
- 如果存在多个配置文件，逐个一对一迁移，不要合并。

找到候选配置后，读取当前文件内容并识别：

- 顶层 `write.platform`
- 顶层 `deploy.platform`
- 顶层 `image.enable`
- 顶层 `image.platform`
- 顶层 `extension.cachePath`、`extension.disableCache`
- 旧配置引用的本地扩展文件路径，例如 `formatExt`、`imagePathExt`、`secretExt`、`image.plugin`

### 2. 抽取旧配置中的事实

把旧配置拆成四组事实，再按附录映射：

| 事实组 | 从哪里读 |
| --- | --- |
| 来源平台 | `write.platform` |
| 来源配置 | `write.notion`、`write.yuque`、`write['yuque-pwd']` 或 `write.feishu` |
| 本地部署配置 | `deploy.local` |
| 图片配置 | `image[image.platform]`，仅当 `image.enable: true` 时使用 |

不要改写用户字段值。路径、文件名字段、Front Matter include/exclude、ENV 名称都以旧配置为准。

### 3. 生成 1.0 配置结构

新配置只需要四块：

| 1.0 位置 | 生成规则 |
| --- | --- |
| `cacheFilePath` | 来自 `extension.cachePath`；没有则按旧缓存命名习惯保留或使用 `elog.cache.json`。 |
| `from` | 按 `write.platform` 选择来源插件，再填入来源配置映射后的字段。 |
| `plugins` | 按顺序放 transform 插件。图片启用时放官方图片插件；有自定义转换时放用户专属自定义 transform。 |
| `to` | 本文只生成 `toLocal(...)`，字段来自 `deploy.local`。 |

生成 imports 时只导入实际用到的插件：

| 旧配置事实 | 新 import |
| --- | --- |
| 任意支持路径 | `defineConfig` from `@elog/cli` |
| Notion 来源 | `fromNotion` from `@elog/plugin-from-notion` |
| 语雀 Token 来源 | `fromYuque` from `@elog/plugin-from-yuque-token` |
| 语雀账号密码来源 | `fromYuque` from `@elog/plugin-from-yuque-pwd` |
| 飞书 Wiki 来源 | `fromFeishuWiki` from `@elog/plugin-from-feishu-wiki` |
| 飞书云空间来源 | `fromFeishuSpace` from `@elog/plugin-from-feishu-space` |
| Local 目标 | `toLocal` from `@elog/plugin-to-local` |
| 图片平台 | 按“图片 transform 插件”附录选择对应 `image*` import |
| 用户自定义转换 | 从你新建的本地 transform 文件 import |

### 4. 决定 transform 顺序

1. 如果旧自定义逻辑只是改正文、属性、Front Matter 字段，先迁移为自定义 transform。
2. 如果旧逻辑需要处理属性图片，例如 `cover`，优先使用图片插件的 `propertyImageFields`，而不是重写上传逻辑。
3. 如果旧逻辑必须在图片替换前处理原始 URL，把自定义 transform 放在图片插件前。
4. 如果旧逻辑必须读取替换后的图片 URL，把自定义 transform 放在图片插件后。
5. 无法判断顺序时，记录原因并询问用户。

### 5. 生成 env example

扫描旧配置中出现的 `process.env.X`，原名写入 env example。不要根据本文示例创造新 ENV 名，不要读取或复制真实密钥。

## 0.x 专用扩展点迁移

### `formatExt`

0.x 的 `deploy.local.formatExt` 在部署前处理文档。1.0 的 `toLocal` 不再接收 `formatExt`；把逻辑迁移到 transform 插件。

迁移方法：

1. 读取 `deploy.local.formatExt` 指向的文件。如果它是函数而不是路径，直接读取旧配置中的函数体。
2. 找到它导出的 `format` 函数。
3. 判断它做了什么：
   - 修改 `doc.body`
   - 修改 `doc.properties`
   - 生成最终 Markdown 字符串
   - 调用 0.x 的 adapter，例如 `matterMarkdownAdapter`
   - 通过旧 `imageClient` 上传属性图片
4. 只保留用户自己的业务转换逻辑。不要把 0.x adapter 调用原样迁移到 transform 插件里；1.0 `toLocal` 会按 `frontMatter` 重新生成 Markdown。
5. 如果它通过 `imageClient` 处理属性图片，优先改用图片插件的 `propertyImageFields`。只有官方图片插件无法表达时，才写自定义图片 transform。
6. 新建用户专属 transform 文件。该插件的输入是 1.0 的 `DocDetail[]`，输出仍然是 `DocDetail[]`。
7. 在新 1.0 config 的 `plugins` 数组中引入该 transform，并按“决定 transform 顺序”放置。

### `imagePathExt`

0.x 的 `imagePathExt` 用来动态计算本地图片保存路径和 Markdown 中的图片前缀。

迁移方法：

1. 读取 `image.local.imagePathExt` 指向的文件。
2. 找到它导出的 `getImagePath` 函数。
3. 判断它是否只是“图片目录跟随文档目录”。如果是，迁移到 `imageLocal.pathFollowDoc`。
4. 如果它按标题、分类、属性、日期或其他业务规则计算路径，不要硬塞到官方字段里。
5. 为该用户新建自定义图片 transform 或自定义图片插件，复用旧 `getImagePath` 的业务规则，并适配 1.0 的 transform 输入输出。
6. 生成新插件时保留旧路径计算意图，但不要假设所有用户都和示例项目一样使用相同目录结构。

### `secretExt`

0.x 的 `secretExt` 用来动态处理图床密钥。1.0 迁移时不要照搬：

迁移方法：

1. 读取旧图床配置中的 `secretExt` 文件。
2. 找到它导出的密钥生成逻辑。
3. 如果它只是从环境变量取值，删除 `secretExt`，直接在新插件配置中使用旧 ENV 名。
4. 如果它会生成临时凭证、动态签名或从外部服务取密钥，不要放进官方图片插件字段。
5. 为该用户新建自定义图片插件或 transform，在插件内部实现凭证获取，再执行上传。

### `image.plugin`

0.x 的 `image.plugin` 不等价于 1.0 的稳定字段。迁移顺序：

1. 找到 `image.plugin` 指向的包、文件或函数。
2. 阅读它的输入输出和副作用：是否下载图片、上传图片、替换正文 URL、处理属性图片、读取密钥。
3. 如果它只是对官方图床做轻量包装，优先替换为对应官方图片插件。
4. 如果它只是改正文或属性，迁移为用户专属 transform。
5. 如果它实现了完整上传流程，迁移为用户专属图片 transform 或自定义图片插件。
6. 迁移后在新配置中 import 新插件，不要继续使用 0.x 的 `image.plugin` 字段。

## 未知字段处理

遇到字段映射附录没有覆盖的字段时：

1. 不要删除，也不要猜。
2. 在迁移说明里写下旧字段位置、旧值、推测语义。
3. 先查项目内旧扩展文件，看它是否只服务于 `formatExt`、`imagePathExt`、`secretExt` 或 `image.plugin`。
4. 再查 [LetTTGACO/elog](https://github.com/LetTTGACO/elog) 的最新实现。
5. 仍不确定时，问用户是否保留、舍弃或改写为自定义插件。

## 迁移后检查清单

- 新 1.0 配置文件已创建，旧 0.x 配置文件未覆盖。
- `from` 只有一个来源插件。
- `to` 使用 `toLocal(...)`。
- `plugins` 只包含 transform 插件数组；没有把单个 transform 对象直接写成 `plugins: imageLocal(...)`。
- `image.enable: false` 的旧配置没有生成图片插件。
- `image.enable: true` 的旧配置已按平台生成一个官方图片插件或自定义插件说明。
- `formatExt` 没有留在 `toLocal` 配置里。
- `secretExt`、`image.plugin` 没有直接复制到官方插件配置里。
- ENV 名称和旧配置一致。
- `.env` 敏感值没有被复制，只生成 example。
- 多个 0.x 配置仍然是一对一迁移，没有合并成一个 1.0 多工作流配置。

## 字段映射附录

### 顶层配置

| 0.x | 1.0 | 说明 |
| --- | --- | --- |
| `write` | `from` | 来源插件，必须是一个 `from*()` 调用结果。 |
| `deploy` | `to` | 部署插件；本文只迁移到 `toLocal()`。 |
| `image` | `plugins` | 图片处理变成 transform 插件数组。 |
| `extension.cachePath` | `cacheFilePath` | 迁移到顶层。 |
| `extension.disableCache` | `disableCache` | 迁移到顶层。 |
| `extension.isForced` | 不迁移 | 1.0 稳定迁移不覆盖该行为。 |
| `extension.isFullCache` | 不迁移 | 1.0 稳定迁移不覆盖该行为。 |

1.0 顶层常用字段：

| 字段 | 类型 | 用法 |
| --- | --- | --- |
| `id` | `string` | 可选工作流 ID。单配置可省略。 |
| `disable` | `boolean` | 是否跳过当前工作流。 |
| `cacheFilePath` | `string` | 缓存文件路径，例如 `elog.cache.json`。 |
| `disableCache` | `boolean` | 是否禁用缓存并全量同步。 |
| `from` | `FromPlugin` | 来源插件。 |
| `plugins` | `TransformPlugin[]` | transform 插件数组，可省略。 |
| `to` | `ToPlugin \| ToPlugin[]` | 部署目标；本文只用单个 `toLocal(...)`。 |
| `deployStrategy` | `'serial' \| 'parallel'` | 多目标部署策略。本文通常不用。 |

### 来源插件

| 0.x 来源 | 1.0 包 | import | factory |
| --- | --- | --- | --- |
| `write.platform: 'notion'` | `@elog/plugin-from-notion` | `fromNotion` | `fromNotion(options)` |
| `write.platform: 'yuque'` | `@elog/plugin-from-yuque-token` | `fromYuque` | `fromYuque(options)` |
| `write.platform: 'yuque-pwd'` | `@elog/plugin-from-yuque-pwd` | `fromYuque` | `fromYuque(options)` |
| `write.platform: 'feishu'` + `write.feishu.type: 'wiki'` | `@elog/plugin-from-feishu-wiki` | `fromFeishuWiki` | `fromFeishuWiki(options)` |
| `write.platform: 'feishu'` + `write.feishu.type` 缺失或为 `space` | `@elog/plugin-from-feishu-space` | `fromFeishuSpace` | `fromFeishuSpace(options)` |

#### `fromNotion(options)`

| 1.0 字段 | 迁移来源 | 说明 |
| --- | --- | --- |
| `token` | `write.notion.token` | 保留旧 ENV 名。 |
| `dataSourceId` | 新字段或用户提供 | Notion 新 data source 查询入口。 |
| `databaseId` | `write.notion.databaseId` | 兼容旧数据库配置。 |
| `filter` | `write.notion.filter` | 原样迁移。 |
| `sorts` | `write.notion.sorts` | 原样迁移。 |
| `catalog` | `write.notion.catalog` | 原样迁移；没有则可省略。 |
| `imgToBase64` | `write.notion.imgToBase64` | 有旧字段才迁移。 |
| `disableCache` | `extension.disableCache` | 推荐迁移到顶层；插件字段只在需要时使用。 |
| `cacheFilePath` | `extension.cachePath` | 推荐迁移到顶层。 |
| `limit` | `write.notion.limit` | 下载并发数；有旧字段才迁移。 |

#### `fromYuque(options)` for Token

| 1.0 字段 | 迁移来源 | 说明 |
| --- | --- | --- |
| `token` | `write.yuque.token` | 保留旧 ENV 名。 |
| `baseUrl` | `write.yuque.baseUrl` | 空字符串可省略。 |
| `login` | `write.yuque.login` | 原样迁移。 |
| `repo` | `write.yuque.repo` | 原样迁移。 |
| `onlyPublic` | `write.yuque.onlyPublic` | 原样迁移。 |
| `onlyPublished` | `write.yuque.onlyPublished` | 原样迁移。 |
| `disableCache` | `extension.disableCache` | 推荐迁移到顶层。 |
| `cacheFilePath` | `extension.cachePath` | 推荐迁移到顶层。 |
| `limit` | `write.yuque.limit` | 下载并发数；有旧字段才迁移。 |

#### `fromYuque(options)` for Password

| 1.0 字段 | 迁移来源 | 说明 |
| --- | --- | --- |
| `baseUrl` | `write['yuque-pwd'].host` 或 `baseUrl` | 1.0 使用 `baseUrl`；空字符串可省略。 |
| `username` | `write['yuque-pwd'].username` | 保留旧 ENV 名。 |
| `password` | `write['yuque-pwd'].password` | 保留旧 ENV 名，以旧配置为准。 |
| `login` | `write['yuque-pwd'].login` | 原样迁移。 |
| `repo` | `write['yuque-pwd'].repo` | 原样迁移。 |
| `latexCode` | `write['yuque-pwd'].latexCode` | 有旧字段才迁移。 |
| `linebreak` | `write['yuque-pwd'].linebreak` | 原样迁移。 |
| `onlyPublic` | `write['yuque-pwd'].onlyPublic` | 原样迁移。 |
| `onlyPublished` | `write['yuque-pwd'].onlyPublished` | 原样迁移。 |
| `disableCache` | `extension.disableCache` | 推荐迁移到顶层。 |
| `cacheFilePath` | `extension.cachePath` | 推荐迁移到顶层。 |
| `limit` | `write['yuque-pwd'].limit` | 下载并发数；有旧字段才迁移。 |

#### `fromFeishuWiki(options)`

0.x 的飞书来源按 `write.feishu.type` 拆成两个 1.0 来源插件。`type: 'wiki'`
迁移到 `fromFeishuWiki`。

| 1.0 字段 | 迁移来源 | 说明 |
| --- | --- | --- |
| `appId` | `write.feishu.appId` | 保留旧 ENV 名。 |
| `appSecret` | `write.feishu.appSecret` | 保留旧 ENV 名。 |
| `wikiId` | `write.feishu.wikiId` | 原样迁移。 |
| `folderToken` | `write.feishu.folderToken` | 可选；用于指定知识库节点。 |
| `baseUrl` | `write.feishu.baseUrl` | 空字符串可省略。 |
| `disableParentDoc` | `write.feishu.disableParentDoc` | 原样迁移；父文档只作为目录时设为 `true`。 |
| `limit` | `write.feishu.limit` | 下载并发数；有旧字段才迁移。 |

#### `fromFeishuSpace(options)`

`write.feishu.type` 缺失或为 `space` 时，迁移到 `fromFeishuSpace`。

| 1.0 字段 | 迁移来源 | 说明 |
| --- | --- | --- |
| `appId` | `write.feishu.appId` | 保留旧 ENV 名。 |
| `appSecret` | `write.feishu.appSecret` | 保留旧 ENV 名。 |
| `folderToken` | `write.feishu.folderToken` | 原样迁移。 |
| `baseUrl` | `write.feishu.baseUrl` | 空字符串可省略。 |
| `limit` | `write.feishu.limit` | 下载并发数；有旧字段才迁移。 |

### Local 目标插件

| 0.x | 1.0 |
| --- | --- |
| `deploy.platform: 'local'` | `@elog/plugin-to-local` + `toLocal(options)` |

| 1.0 字段 | 迁移来源 | 说明 |
| --- | --- | --- |
| `outputDir` | `deploy.local.outputDir` | 原样迁移。 |
| `filename` | `deploy.local.filename` | 原样迁移，例如 `title`、`urlname`。 |
| `fileExt` | 新字段 | 默认 `md`，通常省略。 |
| `keepToc` | `deploy.local.catalog` | 旧 `catalog: true` 迁移为 `keepToc: true`。 |
| `frontMatter.enable` | `deploy.local.frontMatter.enable` | 原样迁移。 |
| `frontMatter.include` | `deploy.local.frontMatter.include` | 原样迁移。 |
| `frontMatter.exclude` | `deploy.local.frontMatter.exclude` | 原样迁移。 |

不要直接复制：

- `deploy.local.format`: 1.0 local 稳定路径写 Markdown。
- `deploy.local.formatExt`: 改为 transform 插件。
- `deploy.local.catalog`: 改名为 `keepToc`。

### 图片 transform 插件

公共字段：

| 1.0 字段 | 说明 |
| --- | --- |
| `disable` | 禁用当前图片 transform。 |
| `limit` | 图片处理并发数。 |
| `propertyImageFields` | 需要一并替换的 `doc.properties` 图片字段，例如 `['cover']`。 |

平台映射：

| 0.x `image.platform` | 1.0 包 | import | factory |
| --- | --- | --- | --- |
| `local` | `@elog/plugin-transform-image-local` | `imageLocal` | `imageLocal(options)` |
| `cos` | `@elog/plugin-transform-image-cos` | `imageCos` | `imageCos(options)` |
| `oss` | `@elog/plugin-transform-image-oss` | `imageOss` | `imageOss(options)` |
| `github` | `@elog/plugin-transform-image-github` | `imageGithub` | `imageGithub(options)` |
| `qiniu` | `@elog/plugin-transform-image-qiniu` | `imageQiniu` | `imageQiniu(options)` |
| `upyun` | `@elog/plugin-transform-image-upyun` | `imageUpyun` | `imageUpyun(options)` |
| `r2` | `@elog/plugin-transform-image-r2` | `imageR2` | `imageR2(options)` |
| `b2` | `@elog/plugin-transform-image-b2` | `imageB2` | `imageB2(options)` |

#### `imageLocal(options)`

| 1.0 字段 | 迁移来源 | 说明 |
| --- | --- | --- |
| `outputDir` | `image.local.outputDir` | 原样迁移。 |
| `prefixKey` | `image.local.prefixKey` | 原样迁移。 |
| `pathFollowDoc.enable` | `image.local.pathFollowDoc` | 旧值为 `true` 时迁移为 `{ enable: true, docOutputDir }`。 |
| `pathFollowDoc.docOutputDir` | `deploy.local.outputDir` | 文档输出目录，用于计算相对图片路径。 |
| `propertyImageFields` | 旧 `formatExt` 中处理的属性图片 | 例如 Notion cover 迁移为 `['cover']`。 |

`pathFollowDoc` 只用于本地图床相对路径。开启后 `prefixKey` 会失效，且需要保证
`pathFollowDoc.docOutputDir` 等于最终文档输出根目录，文档最终目录结构等于
`docOutputDir + docStructure`。如果目标是 `toLocal`，需要同时开启 `keepToc: true`；
`keepToc: false` 时不要开启 `pathFollowDoc`，直接配置 `prefixKey`。

#### `imageCos(options)`

字段：`secretId`、`secretKey`、`bucket`、`region`、`host`、`prefixKey`、`disable`、`limit`、`propertyImageFields`。

#### `imageOss(options)`

字段：`secretId`、`secretKey`、`bucket`、`region`、`host`、`prefixKey`、`disable`、`limit`、`propertyImageFields`。

#### `imageGithub(options)`

字段：`user`、`token`、`repo`、`branch`、`host`、`prefixKey`、`disable`、`limit`、`propertyImageFields`。

#### `imageQiniu(options)`

字段：`secretId`、`secretKey`、`bucket`、`region`、`host`、`prefixKey`、`disable`、`limit`、`propertyImageFields`。

#### `imageUpyun(options)`

字段：`bucket`、`user`、`password`、`host`、`prefixKey`、`disable`、`limit`、`propertyImageFields`。

#### `imageR2(options)`

字段：`host`、`accessKeyId`、`secretAccessKey`、`bucket`、`endpoint`、`region`、`prefixKey`、`disable`、`limit`、`propertyImageFields`。

#### `imageB2(options)`

字段：`host`、`applicationKeyId`、`applicationKey`、`bucket`、`prefixKey`、`disable`、`limit`、`propertyImageFields`。

不要直接复制：

- `image.enable`: 为 `false` 时省略 `plugins` 或不加入图片插件；为 `true` 时加入图片 transform。
- `image.plugin`: 改为官方图片插件或自定义 transform。
- `secretExt`: 改为 ENV 或自定义插件逻辑。
- `imagePathExt`: 优先用 `imageLocal.pathFollowDoc`，不足时自定义。
