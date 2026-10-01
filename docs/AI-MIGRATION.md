# Elog 0.x 到 1.x beta AI 迁移指南

这份文档写给执行迁移的 AI Agent。根据用户实际运行的 0.x 配置、扩展文件和运行入口，生成可验证的 1.x beta 配置，并迁移依赖、同步脚本和 CI。最终交付应说明哪些行为已保留、哪些需要用户决策，以及验证到哪一步。

## 版本和事实来源

本文对照仓库 `master` 的 0.x 实现与 `v1` 的 1.x beta 实现；核对日期为 2026-10-02。Beta 的 API 和发布版本可能变化，执行迁移时再次核对用户锁定的 0.x 版本和准备安装的 1.x 包，而不是只看默认分支或 npm 默认标签。

按以下顺序确认事实：

1. 用户当前的配置、锁文件、扩展代码、同步脚本、CI 和已有输出。
2. 对应版本的 Elog 实现与包类型。0.x 看 `master` 或用户安装版本的源码；1.x 看 `v1` 或目标已发布版本。源码优先于旧文档中的默认值描述。
3. [0.x 官方文档](https://github.com/LetTTGACO/elog-docs/tree/master/docs/notion)：[配置](https://github.com/LetTTGACO/elog-docs/blob/master/docs/notion/config-catalog.md)、[命令](https://github.com/LetTTGACO/elog-docs/blob/master/docs/notion/bry3d3lwe206xuor.md)、[部署](https://github.com/LetTTGACO/elog-docs/blob/master/docs/notion/deploy-platform.md)、[图片](https://github.com/LetTTGACO/elog-docs/blob/master/docs/notion/image-platform.md)。`docs/notion` 是整套旧文档的存放目录，包含语雀、飞书、图床等内容。
4. 公开用户仓库仅用于识别常见使用方式，不能替代当前用户的配置。文末列出核对过的案例。

1.x CLI 能识别 0.x 配置并报 `LEGACY_V0_CONFIG_DETECTED`，不会自动迁移。直接升级依赖后运行旧配置不能完成迁移。

## 给 AI 的第一原则

- 只迁移本文明确支持的路径：Notion / 语雀 Token / 语雀账号密码 / 飞书 → transform（按需处理图片）→ Local。
- 不要覆盖用户现有的 0.x 配置文件。新建 1.x 配置文件。
- 不要复制 `.env` 里的敏感值。只生成 env example，并提醒用户手动迁移。
- 用户旧配置里已有的 `process.env.X` 名称就是事实来源。不要为了贴合示例而改 ENV 名。
- 不要把多个 0.x 配置合并成一个 1.x 多工作流配置。本文只处理一对一迁移，每份新配置使用独立的新缓存。
- 未知字段不要猜，也不要悄悄丢弃。先核对对应版本的实现；仍无法确定时，记录具体缺口并询问用户。
- 保留用户已有的未说明改动。首次验证使用独立输出目录与新缓存，避免覆盖博客中的手写内容。

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
- 把多个 0.x config 合并成一个 1.x 多工作流 config。

## 推荐执行流程

1. 找到旧配置文件：通常是 `elog.config.js`、`elog.config.notion.js`、`elog.config.yuque-token.js` 这类文件。
2. 读取旧配置的 `write.platform`、`deploy.platform`、`image.enable`、`image.platform`。
3. 如果来源或目标不在迁移边界内，停止迁移并告诉用户该配置不在本文支持范围内。
4. 记录实际生效的 ENV 引用、CLI 参数、缓存、输出路径和扩展行为；按“字段映射附录”拆成 `from`、`plugins`、`to`。
5. 如果 `image.enable` 为 false 或缺失，通常省略图片 transform；若 `enableForExt` 或扩展代码仍调用图床，先按“仅扩展使用图床”处理。
6. 如果 `image.enable: true`，按 `image.platform` 添加一个官方图片 transform 插件。
7. 如果旧配置用了来源或部署的 `formatExt`、`imagePathExt`、`secretExt`、`image.plugin`，先看“0.x 专用扩展点迁移”。
8. 新建 1.x 配置文件，不覆盖旧文件。
9. 生成 env example，只列变量名，不填真实密钥。
10. 按“验证和切换”执行静态核对、隔离同步与博客构建，再切换实际运行入口；按“交付报告”说明结果。

## 文件生成规则

- 旧文件是 `elog.config.js` 时，优先新建 `elog.config.1x.ts`。
- 旧文件是 `elog.config.notion.js` 时，优先新建 `elog.config.notion.1x.ts`。
- 旧文件是 `elog.config.yuque-token.js` 时，优先新建 `elog.config.yuque-token.1x.ts`。
- 旧文件是 `elog.config.shorturl.js` 时，优先新建 `elog.config.shorturl.1x.ts`。
- 如果用户项目不方便使用 TypeScript config，可以新建 `.mjs`；1.x 使用 ESM import 和 `export default`。
- 保持项目原有的 `package.json.type`，不要为了 Elog 将整个 CommonJS 博客改为 ESM。`.ts` 配置由 CLI 加载，不要求博客安装 TypeScript；类型检查另行安排。
- 新文件已存在时先读取，与本轮改动合并；不要覆盖上次迁移结果。
- 自定义 transform 插件建议放在 `elog.transforms.ts` 或 `elog.transform.<name>.ts`，再由新 config import。
- env example 建议命名为 `.env.elog.example`；如果项目已有同类文件，追加前先读最新版。

运行时使用项目安装的 CLI，显式指定新配置和原 ENV 文件，例如：

```bash
# npm 项目；pnpm 项目用 pnpm exec elog，Yarn 项目用 yarn elog
npm exec -- elog sync -c elog.config.1x.ts -e .elog.env
```

`-e` 必须来自旧运行入口。未指定 `-e` 时，CLI 只使用系统环境变量，不会自动读取 `.env` 或 `.elog.env`。在 CI 已通过 `env` 注入变量时，继续使用系统环境变量即可。

## 依赖和运行环境迁移

1.x 包是 ESM，当前 CLI 要求 Node `>=22.13.0`。同步检查本地 Node、`.nvmrc` / `.node-version`、`package.json.engines`、CI 的 `node-version` 和部署构建环境。检查用户博客框架在目标 Node 下能正常构建。

先查询目标发布通道，再逐包选择确切的 1.x 版本：

```bash
npm view @elog/cli dist-tags --json
npm view @elog/cli@beta version engines --json
# 按实际来源、目标和图床查询；这里以 Notion + Local 图片为例
npm view @elog/plugin-from-notion@beta version --json
npm view @elog/plugin-to-local@beta version --json
npm view @elog/plugin-transform-image-local@beta version --json
```

核对时 CLI 的 `latest` 是 `0.14.7`，`beta` 是 `1.0.0-beta.5`。因此 **`npm view @elog/cli version` 或不带版本的安装可能仍选中 0.x**。这些数字只说明核对时的状态，不是永久安装指令。若某包没有 `beta` 标签，查询其 `dist-tags` / `versions`，选择与目标 CLI 兼容的已发布 1.x 版本；查询失败时报告缺口，不猜版本。

生成依赖时：

- CLI 运行包和 `defineConfig` 入口均为 `@elog/cli`，Core 由 CLI 的正常依赖安装。
- 只增加生效来源、`@elog/plugin-to-local` 和实际需要的图片插件。
- 本地 transform 若 import 了 `@elog/plugin-sdk` 的类型或 helper，也必须声明该直接依赖。配置只引用官方插件时无需额外安装 SDK。
- 按用户原有的 npm / pnpm / Yarn 管理依赖并更新对应锁文件，保持原依赖分组。CI 使用 `--omit=dev` / `--prod` 时，运行期使用的 CLI、插件、helper 和扩展依赖必须能被安装。
- 各包独立发布，不能假设所有包的版本相同；使用查询到的确切版本，避免 beta 迁移期间漂移。
- 已有全局 0.x CLI 不作为验证入口。使用项目 scripts 或包管理器的本地执行命令，并确认 `elog --version` 为选定的 1.x。
- 保存依赖清单、锁文件和旧运行入口的迁移前状态，供回退使用。旧配置未变不代表升级后的 CLI 还能运行它。

## 命令和 CI 迁移

读取 `package.json` scripts、shell 脚本、GitHub Actions、部署平台构建命令中的每一个 Elog 调用。旧 CLI 会把参数与 `extension` 合并，**显式的 `extension` 字段优先于 CLI 值**；据此记录最终生效的行为。

| 0.x 用法 | 1.x 处理 |
| --- | --- |
| `sync -c / --config` | 保留选项，指向新配置。 |
| `sync -e / --env` | 保留原 ENV 路径。 |
| `sync --debug` | 保留。 |
| `sync -a / --cache` | 移入新配置的 `cacheFilePath`，使用独立的 1.x 缓存路径。 |
| `sync --disable-cache` | 移入配置的顶层 `disableCache: true`；如果只是一次全量验证，仅用于验证配置。 |
| `sync --force` / `extension.isForced` | 当前迁移路径没有自动删除旧本地文章的等价行为；记录用户是否依赖删除同步，需明确处理后再切换。 |
| `sync --full-cache` / `extension.isFullCache` | 新缓存不保存正文；读取旧缓存正文的工具要另行适配。 |
| `clean` | 不能继续放入 1.x 流程；查明它是否删除输出、清缓存或驱动重建，单独处理对应需求。 |
| `upgrade` | 由包管理器更新所选 1.x 依赖和锁文件。 |

1.x `sync` 仅有 `-c`、`-e`、`--debug`；它没有 `--dry-run`、`--check` 或独立的配置检查命令。`init --dry-run` 仅预览初始化输出，不能验证已有迁移配置。

先增加迁移专用 scripts，例如 `elog:sync:1x`、`elog:sync-local:1x`。验证通过后再将用户原来的同步入口指向新配置，避免 CI 仍按默认名称加载旧文件。例如旧命令：

```bash
elog sync -e .elog.env -c elog.config.shorturl.js -a elog.cache.shorturl.json
```

新 script 的命令：

```bash
elog sync -e .elog.env -c elog.config.shorturl.1x.ts
```

对应新配置设置 `cacheFilePath: 'elog.cache.shorturl.1x.json'`。缓存参数不再留在命令中。

CI 同步修改 Node 版本、依赖安装、Elog 调用和缓存路径；如果原来全局安装 0.x，改为安装项目锁定依赖并通过 scripts 执行。保留 Secrets 名与注入方式，不创建或读取密钥。若使用 Actions cache，为 1.x 使用独立 key，避免恢复 0.x 缓存。核对忽略规则以及显式提交产物的脚本是否需要识别新缓存，验证目录和备份不应被提交。不要把迁移验证过程中的上传、提交或部署触发器混入静态检查。

## 缓存和输出隔离

0.x 缓存是 `{ docs, catalog }`，1.x 是 `{ cachedDocList, sortedDocList }`，文档身份和更新时间字段也不同。1.x 读取旧缓存通常会当作空缓存并全量下载，后续写入会覆盖原文件；这不是缓存格式迁移。

- 从 `extension.cachePath`、旧 `-a` 参数或默认值确定旧缓存路径，再派生新路径。例如 `elog.cache.json` → `elog.cache.1x.json`。
- 每份配置显式写 `cacheFilePath`；多份独立配置不能共同使用默认 `elog.cache.json`，否则会串用缓存。
- 不复制、重命名或手改旧缓存冒充 1.x 缓存。首次使用新缓存做全量同步，保留旧缓存供回退。
- 修改 transform、文件名、目录或图片配置后，仅靠来源更新时间未必会重新处理全部文档；验证时使用新的测试缓存或临时顶层 `disableCache: true`。
- `disableCache: true` 只禁用读取，正常 `sync` 仍会写入配置指定的新缓存，不能视作无副作用检查。
- 验证配置指向独立文档和本地图片目录；最终配置保留用户原输出路径。相对路径以运行命令的工作目录计算，不以配置文件目录计算。
- Local 部署会写文件，不能用生产目录做首次试跑。验证云图床时也会产生上传副作用，使用用户授权的图床目标和测试前缀，并检查生成 URL。

## ENV 迁移规则

保留旧 ENV 名。迁移时扫描生效配置、它引用的 helper / 扩展及运行脚本中的 `process.env.<NAME>`、`process.env['NAME']`、解构或间接 ENV 引用：

- 新配置继续使用同一个 `<NAME>`；无法静态解析的动态变量名记录为待确认项。
- env example 只写 `<NAME>=`。
- 不要根据本文、官方示例或变量命名偏好改名。
- 不要读取、复制或重写用户真实 `.env` 里的值。
- 最终提醒用户手动把敏感值迁移到新运行环境。原 ENV 文件可继续通过 `-e` 使用，不必为了迁移新建含密钥的文件。
- 0.x 部分来源会隐式读取默认 ENV，例如 Notion 的 `NOTION_TOKEN`、语雀的 `YUQUE_TOKEN` / `YUQUE_USERNAME` / `YUQUE_PASSWORD`；1.x 要显式传入插件配置。只有对应旧版本实现确实使用了该回退时才补上这些原变量名。
- 旧配置若硬编码密钥，在说明和新文件中使用空占位 ENV，并标明需用户填写；不要把字面量带到报告或提交中。

## 配置迁移方法

不要从本文复制一份固定配置给用户。你要根据用户自己的 0.x 配置生成一份新配置。

### 1. 找到用户正在使用的 0.x 配置

优先按运行入口找：

- 读 `package.json` scripts、CI 与 shell 入口，确认 CLI 的安装方式、版本、工作目录、`-c`、`-e`、`-a` 和其他参数。
- 搜索 `elog.config` 命名的文件。
- 如果存在多个配置文件，逐个一对一迁移，不要合并。

找到候选配置后，读取当前文件内容并识别：

- 顶层 `write.platform`
- 顶层 `deploy.platform`
- 顶层 `image.enable`
- 顶层 `image.platform`、`image.enableForExt`、`image.limit`
- 顶层 `extension.cachePath`、`extension.disableCache`
- 旧配置引用的 helper 和扩展文件，例如来源或部署的 `formatExt`、`imagePathExt`、`secretExt`、`image.plugin`。配置加载会执行这些代码，先静态读取，查明副作用。

### 2. 抽取旧配置中的事实

把旧配置拆成四组事实，再按附录映射：

| 事实组 | 从哪里读 |
| --- | --- |
| 来源平台 | `write.platform` |
| 来源配置 | `write.notion`、`write.yuque`、`write['yuque-pwd']` 或 `write.feishu` |
| 本地部署配置 | `deploy.local` |
| 图片配置 | 生效的 `image[image.platform]`、`image.limit`，以及扩展使用图床的方式 |

路径、文件名字段、Front Matter include/exclude、ENV 名称都以旧配置为准；有语义变化的字段按附录转换并说明原因。

只迁移被 `platform` 选中的配置。例如 `write.platform: 'yuque-pwd'` 时，不把备用 `write.yuque.onlyPublished` 合入密码来源；停用平台的 token 也无需放入新 ENV example。

### 3. 生成 1.x 配置结构

新配置只需要四块：

| 1.x 位置 | 生成规则 |
| --- | --- |
| `cacheFilePath` | 根据旧生效缓存路径派生独立的 1.x 路径，见“缓存和输出隔离”。 |
| `disableCache` | 来自旧生效的 `extension.disableCache` 或 `--disable-cache`；常规增量配置通常省略。 |
| `from` | 按 `write.platform` 选择来源插件，再填入来源配置映射后的字段。 |
| `plugins` | 按顺序放 transform 插件。图片启用时放官方图片插件；有自定义转换时放用户专属自定义 transform。 |
| `to` | 本文只生成 `toLocal(...)`，字段来自 `deploy.local`。 |

插件工厂是 **default export**，`defineConfig` 是具名导出。使用 `import fromNotion from '@elog/plugin-from-notion'`，不要写 `import { fromNotion } ...`。只导入实际用到的插件：

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
5. 0.x 实际顺序通常是来源处理 → 正文图片替换 → Front Matter 过滤 → 部署 `formatExt`。保留业务依赖；不要默认把所有旧 `formatExt` 放到图片插件前。
6. 1.x transform 先于 `toLocal` 的 Front Matter 过滤，旧扩展若依赖过滤后的属性，需适配该先后差异。
7. 无法判断顺序时，记录原因并询问用户。

### 5. 生成 env example

按“ENV 迁移规则”收集生效配置及扩展引用的变量，原名去重写入 env example。不把停用的平台凭证当作运行必需项。

## 0.x 专用扩展点迁移

### 部署 `deploy.local.formatExt`

0.x 的 `deploy.local.formatExt` 在部署前处理文档。1.x 的 `toLocal` 不再接收 `formatExt`；把逻辑迁移到 transform 插件。

迁移方法：

1. 读取 `deploy.local.formatExt` 指向的文件或包及其引用文件；若用户的旧版本支持内联函数，读取函数体。
2. 找到它导出的 `format` 函数。
3. 判断它做了什么：
   - 修改 `doc.body`
   - 修改 `doc.properties`
   - 生成最终 Markdown 字符串
   - 调用 0.x 的 adapter，例如 `matterMarkdownAdapter`
   - 通过旧 `imageClient` 上传属性图片
4. 只保留用户自己的业务转换逻辑。不要把 0.x adapter 调用原样迁移到 transform 插件里；1.x `toLocal` 会按 `frontMatter` 重新生成 Markdown。
5. 如果它通过 `imageClient` 处理属性图片，优先改用图片插件的 `propertyImageFields`。只有官方图片插件无法表达时，才写自定义图片 transform。
6. 新建用户专属 transform 文件。该插件的输入是 `DocDetail[]`，输出仍然是 `DocDetail[]`；逐个 await 旧业务逻辑，保持文档数量及唯一 ID 集合不变。
7. 在新 1.x config 的 `plugins` 数组中引入该 transform，并按“决定 transform 顺序”放置。

0.12 之前的扩展常返回 Markdown 字符串，后续版本常返回文档对象，且可能在内部调用 adapter。无论旧返回方式如何，迁移后的 transform 只更新 `body` / `properties` 并返回文档数组。普通 Front Matter 序列化交给 `toLocal`，避免重复生成 YAML。若扩展还自定义了序列化格式，需要单独保留并验证该行为。

### 来源 `write.yuque.formatExt`

这个字段与部署 `formatExt` 是两个扩展点。0.x Token 来源支持布尔值、路径或函数，处理来源 Markdown 字符串；1.x `fromYuque` 没有该配置项。读取旧版本实现和真实扩展，迁移自定义正文逻辑到图片插件前的 transform，返回文档数组。若旧函数需要原始 HTML 或平台原始响应，需要核对 1.x 来源输出能否提供相同输入，再决定是否自定义来源插件，不能靠字段改名解决。

### 仅扩展使用图床 `image.enableForExt`

0.x 可在不替换正文图片时创建图床 client，供 `formatExt` 上传 `cover` 等字段。此时直接加入官方图片 transform 会额外替换正文图片。先读取扩展确认上传范围；官方 `propertyImageFields` 会在替换正文图片的同时处理指定属性，不能表达“只上传封面”。保持仅属性上传行为时，应使用自定义图片 transform，通过 SDK helper / uploader 实现；若用户明确同意同时处理正文，才改用官方图片插件。

### `imagePathExt`

0.x 的 `imagePathExt` 用来动态计算本地图片保存路径和 Markdown 中的图片前缀。

迁移方法：

1. 读取 `image.local.imagePathExt` 指向的文件。
2. 找到它导出的 `getImagePath` 函数。
3. 判断它是否只是“统一图片输出目录，计算相对于文档目录的链接”。如果是，按目录条件迁移到 `imageLocal.pathFollowDoc`。该字段不代表把图片按文章分文件夹保存。
4. 如果它按标题、分类、属性、日期或其他业务规则计算路径，不要硬塞到官方字段里。
5. 为该用户新建自定义图片 transform 或自定义图片插件，复用旧 `getImagePath` 的业务规则，并适配 1.x 的 transform 输入输出。
6. 生成新插件时保留旧路径计算意图，但不要假设所有用户都和示例项目一样使用相同目录结构。

### `secretExt`

0.x 的 `secretExt` 用来动态处理图床密钥。1.x 迁移时不要照搬：

迁移方法：

1. 读取旧图床配置中的 `secretExt` 文件。
2. 找到它导出的密钥生成逻辑。
3. 如果它只是从环境变量取值，删除 `secretExt`，直接在新插件配置中使用旧 ENV 名。
4. 如果它会生成临时凭证、动态签名或从外部服务取密钥，不要放进官方图片插件字段。
5. 为该用户新建自定义图片插件或 transform，在插件内部实现凭证获取，再执行上传。SDK 凭证字段也要适配，例如 OSS 临时令牌使用 `stsToken`，不能假定旧扩展返回字段可直接复制。

### `image.plugin`

0.x 的 `image.plugin` 不等价于 1.x 的稳定字段。迁移顺序：

1. 找到 `image.plugin` 指向的包、文件或函数。
2. 阅读它的输入输出和副作用：是否下载图片、上传图片、替换正文 URL、处理属性图片、读取密钥。
3. 如果它只是对官方图床做轻量包装，优先替换为对应官方图片插件。
4. 如果它只是改正文或属性，迁移为用户专属 transform。
5. 如果它实现了完整上传流程，迁移为用户专属图片 transform 或自定义图片插件。
6. 迁移后在新配置中 import 新插件，不要继续使用 0.x 的 `image.plugin` 字段。

### 自定义插件的文档字段和接口

从 `@elog/plugin-sdk` 导入 `TransformPlugin`、`DocDetail`、`PluginContext` 或图片 helper；不要继续从 0.x 的 `@elog/cli` 导入 adapter / shared 工具。

| 0.x 扩展常用字段 / API | 1.x 适配 |
| --- | --- |
| `doc.doc_id` | 使用来源提供的 `doc.id`，保持它不变。 |
| 顶层 `doc.updated` | 标准同步时间为 `doc.updateTime`；`doc.properties.updated` 仍是展示属性。 |
| `doc.catalog[].doc_id` | 标准目录为 `doc.docStructure[].id`，目录名称仍为 `title`。 |
| `doc.docPath` | 按最终 `outputDir` 和 `keepToc` 从 `docStructure` 计算文档所在目录。 |
| `doc.body_original` | 核对来源提供的 `rawBody` / `rawBodyType`，不可假定所有来源都有原始正文。 |
| `doc.body_html` / `doc.body_wiki` | 核对来源实际输出及 `bodyType`；需要旧原始数据时单独适配。 |
| `realName` / `relativePath` | 不作为标准部署结果提供；引用它们的后处理脚本需要适配。 |
| `imageClient.uploadImageFromUrl` | 官方插件处理正文及 `propertyImageFields`；自定义上传通过 SDK 的 `ImageUploader` / `ElogImageContext`。 |
| 图床 `uploadImg(buffer, imageName, doc)` | SDK uploader 使用 `uploadImage(fileName, buffer, doc)`，注意参数顺序改变；`hasImage(filename)` 返回已有 URL 或空值。 |

标准 transform 是 `{ name, kind: 'transform', async transform(docs, ctx) { return docs; } }`。不能返回字符串、单个 doc、删掉 doc 或生成新的 doc ID。transform 接收到的是本轮新增 / 更新的文档，不一定是全部文档；更改转换逻辑后用全量验证。

`ctx` 通过参数传入，不依赖 hook 的 `this`。`ctx.logger.error(message)` 会抛错并终止插件，不是普通日志；异步上传必须 await，插件不得调用 `process.exit()`。

## 未知字段处理

遇到字段映射附录没有覆盖的字段时：

1. 不要删除，也不要猜。
2. 在迁移说明里写下旧字段位置、脱敏值、已核实的作用；推测必须显式标注。
3. 先查项目内旧扩展文件，看它是否只服务于 `formatExt`、`imagePathExt`、`secretExt` 或 `image.plugin`。
4. 对照用户安装的 0.x 版本与目标 1.x 版本实现，区分实际生效、旧版已忽略与需要重写的字段。
5. 仍不确定时，问用户是否保留、舍弃或改写为自定义插件。

## 迁移示例

以下配置演示如何从公开 0.x 案例推导新结构；实际执行时替换为当前用户的值。示例是最终配置，首次实跑需按下一节另建隔离验证配置。

### Notion 到 Hexo 与本地图片

[Notion Hexo 模板](https://github.com/elog-x/notion-hexo/blob/ac8061b5c43568827919a7f7529489837cb12a73/elog.config.js) 使用 `status=已发布` 过滤、`./source/_posts`、`/images` 前缀和上传封面的 `format-image.js`。封面逻辑可以由 `propertyImageFields` 表达，旧 adapter 调用由 `toLocal.frontMatter` 接管，无需本地 transform。

`elog.config.1x.ts`：

```ts
import { defineConfig } from '@elog/cli';
import fromNotion from '@elog/plugin-from-notion';
import imageLocal from '@elog/plugin-transform-image-local';
import toLocal from '@elog/plugin-to-local';

export default defineConfig({
  cacheFilePath: 'elog.cache.1x.json',
  from: fromNotion({
    token: process.env.NOTION_TOKEN,
    databaseId: process.env.NOTION_DATABASE_ID,
    filter: { property: 'status', select: { equals: '已发布' } },
  }),
  plugins: [
    imageLocal({
      outputDir: './source/images',
      prefixKey: '/images',
      propertyImageFields: ['cover'],
    }),
  ],
  to: toLocal({
    outputDir: './source/_posts',
    filename: 'title',
    keepToc: false,
    frontMatter: {
      enable: true,
      include: [
        'categories',
        'tags',
        'title',
        'date',
        'updated',
        'permalink',
        'cover',
        'description',
      ],
    },
  }),
});
```

`.env.elog.example`：

```dotenv
NOTION_TOKEN=
NOTION_DATABASE_ID=
```

该模板还有 `frontMatter.timeFormat: true`。它不在当前 `toLocal` 类型中，核对的 `master` Local / adapter 实现也未读取它；对用户项目应核对其安装版本及扩展，确认没有实际作用后再省略，而不是直接塞入新插件。

Notion 的 `databaseId` 可以继续使用，插件会查询数据库并选第一个 data source；已有多个 data source 时需确认哪个才是目标。`dataSourceId` 有优先级，不能将旧数据库 ID 改名当作 data source ID；使用旧 ID 的迁移也不要求用户修改数据库属性、过滤条件或 Integration Token。

### 语雀账号密码到 VitePress 与正文 transform

[语雀 VitePress 模板](https://github.com/elog-x/yuque-vitepress/blob/01a8004f2c454fb3fa5715f6f2b759514d2d517d/elog.config.js) 选中 `yuque-pwd`，同时保留备用 Token 配置；新配置只迁移密码来源。旧 `elog.format.js` 将语雀提示块转换成 VitePress 提示块。

`elog.transforms.ts`：

```ts
import type { TransformPlugin } from '@elog/plugin-sdk';

export default function vitepressBlocks(): TransformPlugin {
  return {
    name: 'transform:vitepress-blocks',
    kind: 'transform',
    async transform(docs) {
      for (const doc of docs) {
        doc.body = doc.body.replaceAll(':::tips', ':::tip').replaceAll(':::success', ':::tip');
      }
      return docs;
    },
  };
}
```

`elog.config.1x.ts`：

```ts
import { defineConfig } from '@elog/cli';
import fromYuque from '@elog/plugin-from-yuque-pwd';
import imageLocal from '@elog/plugin-transform-image-local';
import toLocal from '@elog/plugin-to-local';
import vitepressBlocks from './elog.transforms';

export default defineConfig({
  cacheFilePath: 'elog.cache.1x.json',
  from: fromYuque({
    username: process.env.YUQUE_USERNAME,
    password: process.env.YUQUE_PASSWORD,
    login: process.env.YUQUE_LOGIN,
    repo: process.env.YUQUE_REPO,
  }),
  plugins: [
    imageLocal({
      outputDir: './docs/images',
      pathFollowDoc: { enable: true, docOutputDir: './docs/docs' },
    }),
    vitepressBlocks(),
  ],
  to: toLocal({
    outputDir: './docs/docs',
    filename: 'title',
    keepToc: true,
  }),
});
```

增加直接依赖 `@elog/plugin-sdk`，ENV example 只包含 `YUQUE_USERNAME`、`YUQUE_PASSWORD`、`YUQUE_LOGIN`、`YUQUE_REPO`。旧 `formatExt` 在正文图片替换后执行，上述顺序保持该行为。

若同时迁移模板中的 `elog.config.shorturl.js`，另建配置并使用独立缓存，保留 `filename: 'urlname'` 和平铺输出。该配置图片仍存入 `./docs/images`，因此使用 `prefixKey: '../images'`，而不是直接沿用上面的 `pathFollowDoc`。

## 验证和切换

### 1. 静态核对

- 确认选定 1.x 版本、Node 和依赖可用，运行本地 CLI 的 `--version` 与 `sync --help`，确认命令没有旧选项。
- 检查 default import、`export default defineConfig(...)`、`plugins` 数组、字段类型及本地扩展 import。用户已有 TypeScript 检查时纳入新文件；否则做静态核对，不能把 CLI 的形状校验当作全部插件选项校验。
- 对每个旧字段和扩展行为标明迁移位置，包含来源筛选、目录、Front Matter、属性图片、缓存参数和 CI。未知字段未解决时不要声称完整迁移。
- 保留原工作目录，核对输出位置、文件名属性和图片前缀。检查已有 ENV 文件或 CI 注入位置的存在性，不读取敏感值。

### 2. 隔离实跑

在用户已授权同步且运行凭证可用时，另建例如 `elog.config.1x.verify.ts`：来源、筛选和业务转换与最终配置一致，文档与本地图片输出指向独立测试目录，缓存也使用独立文件。若开启 `pathFollowDoc`，其 `docOutputDir` 随测试文档根目录一起改变；云图床按授权范围准备测试目标。加载配置会执行 import 的代码，先检查旧 helper 的副作用。

```bash
# 示例；保留用户实际的包管理器、工作目录和 ENV 文件路径
npm exec -- elog sync -c elog.config.1x.verify.ts -e .elog.env
```

首次同步应全量下载。比较旧输出与测试输出：文件数量和命名、目录结构、标题与日期、Front Matter 的 include/exclude、自定义提示块、公式和换行、正文及封面图片链接。确认相对图片确实能从文档目录访问，Notion 临时图片 URL 已按旧需求转存，Front Matter 只生成一次。

再用**同一份验证配置、同一个新缓存**同步一次，确认无来源更新时跳过下载后的转换 / 部署。第二次不得继续设置 `disableCache: true`，否则无法验证增量行为。若首次因筛选或空知识库返回零文档，要明确说明它只验证了空跑，不能代替内容验证。

运行用户原有 Hexo / VitePress / Hugo / MkDocs 构建，并让构建读取测试输出或在隔离副本中检查。只有退出码成功且关键内容与图片正确，才算完成输出验证；图床可能跳过失败图片，不能仅凭 CLI 退出码认定图片迁移成功。

### 3. 切换与回退

验证通过后，将正式 scripts、CI 和构建入口指向最终新配置，正式输出目录恢复用户原路径，保留独立 1.x 缓存。处理用户依赖的删除同步 / clean 行为后再切换。首次正式同步仍使用新缓存，全量写入需要确认已有手写文档和同名文件的处理方式。

回退时恢复迁移前的依赖清单与锁文件，安装原 0.x 版本，恢复旧配置、旧 ENV 入口及旧缓存，并按验证前备份恢复被覆盖的输出。仅切回旧配置文件不足以回退 CLI 版本。

## 交付报告

交付时说明：

1. 旧配置到新配置的一对一对应关系，以及新增 / 修改的文件。
2. CLI / 插件确切版本、运行 Node、包管理器、安装及同步命令。
3. 字段和扩展的迁移结果，包括语义转换、旧版本已忽略的字段与待确认行为；不包含敏感值。
4. 缓存隔离、实际输出和 ENV 名称，用户需要补齐的凭证位置。
5. 实际执行的静态检查、隔离同步、第二次增量同步和博客构建结果；未执行时写明原因。
6. 正式切换入口和回退方式。

配置已生成、验证通过、正式入口已切换是不同完成状态。缺凭证时交付配置与静态检查结果，明确实跑尚未完成；不要声称已经验证真实同步。

## 迁移后检查清单

- 新 1.x 配置文件已创建，旧 0.x 配置文件未覆盖。
- `from` 只有一个来源插件。
- `to` 使用 `toLocal(...)`。
- `plugins` 只包含 transform 插件数组；没有把单个 transform 对象直接写成 `plugins: imageLocal(...)`。
- `image.enable` 关闭或缺失时，已核对 `enableForExt` 及扩展是否仍使用图床。
- `image.enable: true` 的旧配置已按平台生成一个官方图片插件或自定义插件说明。
- `formatExt` 没有留在 `toLocal` 配置里。
- `secretExt`、`image.plugin` 没有直接复制到官方插件配置里。
- ENV 名称和旧配置一致。
- ENV example 覆盖生效配置、helper 与扩展引用；敏感值没有被复制。
- 缓存使用独立的新路径，旧缓存保持原样。
- Node、依赖、锁文件、脚本与 CI 同步更新；使用的确实是本地 1.x CLI。
- 隔离输出、图片链接、Front Matter、增量空跑和博客构建均有验证结果或明确未验证原因。
- 多个 0.x 配置仍然是一对一迁移，没有合并成一个 1.x 多工作流配置。

## 字段映射附录

### 顶层配置

| 0.x | 1.x | 说明 |
| --- | --- | --- |
| `write` | `from` | 来源插件，必须是一个 `from*()` 调用结果。 |
| `deploy` | `to` | 部署插件；本文只迁移到 `toLocal()`。 |
| `image` | `plugins` | 图片处理变成 transform 插件数组。 |
| `extension.cachePath` / CLI `-a` | `cacheFilePath` | 顶层设置独立的新缓存路径，保留旧缓存。 |
| `extension.disableCache` / CLI `--disable-cache` | `disableCache` | 按旧最终生效值迁移到顶层。 |
| `extension.isForced` | 不迁移 | 见命令迁移，需单独处理依赖该行为的流程。 |
| `extension.isFullCache` | 不迁移 | 见命令迁移，需单独处理依赖该行为的流程。 |

1.x 顶层常用字段：

| 字段 | 类型 | 用法 |
| --- | --- | --- |
| `id` | `string` | 可选工作流 ID。单配置可省略。 |
| `disable` | `boolean` | 是否跳过当前工作流。 |
| `cacheFilePath` | `string` | 缓存文件路径，迁移时显式设置新路径，例如 `elog.cache.1x.json`。 |
| `disableCache` | `boolean` | 是否禁用缓存并全量同步。 |
| `from` | `FromPlugin` | 来源插件。 |
| `plugins` | `TransformPlugin[]` | transform 插件数组，可省略。 |
| `to` | `ToPlugin \| ToPlugin[]` | 部署目标；本文只用单个 `toLocal(...)`。 |
| `deployStrategy` | `'serial' \| 'parallel'` | 多目标部署策略。本文通常不用。 |

### 来源插件

| 0.x 来源 | 1.x 包 | import | factory |
| --- | --- | --- | --- |
| `write.platform: 'notion'` | `@elog/plugin-from-notion` | `fromNotion` | `fromNotion(options)` |
| `write.platform: 'yuque'` | `@elog/plugin-from-yuque-token` | `fromYuque` | `fromYuque(options)` |
| `write.platform: 'yuque-pwd'` | `@elog/plugin-from-yuque-pwd` | `fromYuque` | `fromYuque(options)` |
| `write.platform: 'feishu'` + `write.feishu.type: 'wiki'` | `@elog/plugin-from-feishu-wiki` | `fromFeishuWiki` | `fromFeishuWiki(options)` |
| `write.platform: 'feishu'` + `write.feishu.type` 缺失或为 `space` | `@elog/plugin-from-feishu-space` | `fromFeishuSpace` | `fromFeishuSpace(options)` |

#### `fromNotion(options)`

| 1.x 字段 | 迁移来源 | 说明 |
| --- | --- | --- |
| `token` | `write.notion.token` | 保留旧 ENV 名。 |
| `dataSourceId` | 用户已有的明确 data source ID | 可选；不可把 `databaseId` 的值改名填入此字段。 |
| `databaseId` | `write.notion.databaseId` | 兼容旧数据库配置。 |
| `filter` | `write.notion.filter` | 原样迁移。 |
| `sorts` | `write.notion.sorts` | 原样迁移。 |
| `catalog` | `write.notion.catalog` | 原样迁移；没有则可省略。 |
| `imgToBase64` | `write.notion.imgToBase64` | 有旧字段才迁移。 |
| `limit` | `write.notion.limit` | 下载并发数；有旧字段才迁移。 |

Notion 的旧 `sorts` 布尔值、自定义排序或预设字符串都要保留语义。当前包类型将排序预设和 `direction` 声明为 enum，旧字符串写入 `.ts` 配置可能产生类型错误；遇到这一情况可选择 `.mjs` 保留运行时支持的原值，并核对目标版本的类型。不要为了通过类型检查把旧排序改成 `sorts: true`，它表示默认按创建时间倒序。

#### `fromYuque(options)` for Token

| 1.x 字段 | 迁移来源 | 说明 |
| --- | --- | --- |
| `token` | `write.yuque.token` | 保留旧 ENV 名。 |
| `baseUrl` | `write.yuque.baseUrl` | 0.x 是 API 根路径，1.x 是站点根路径，见下文。 |
| `login` | `write.yuque.login` | 原样迁移。 |
| `repo` | `write.yuque.repo` | 原样迁移。 |
| `onlyPublic` | `write.yuque.onlyPublic` | 原样迁移。 |
| `onlyPublished` | `write.yuque.onlyPublished` | 原样迁移。 |
| `limit` | `write.yuque.limit` | 下载并发数；有旧字段才迁移。 |

0.x Token 来源默认请求根路径是 `https://www.yuque.com/api/v2`；1.x 会自行追加 `/api/v2`。旧自定义 `baseUrl` 为站点根路径加 `/api/v2` 时移除末尾这一段，例如 `https://example.com/api/v2/` → `https://example.com`。自定义代理有额外前缀时先检查最终请求 URL，不能盲目追加导致 `/api/v2/api/v2`。

`write.yuque.formatExt` 见来源扩展迁移；缓存行为统一配置在工作流顶层。

#### `fromYuque(options)` for Password

| 1.x 字段 | 迁移来源 | 说明 |
| --- | --- | --- |
| `baseUrl` | `write['yuque-pwd'].host` | 1.x 使用站点根路径 `baseUrl`；空字符串可省略。旧配置仅有 `baseUrl` 时先确认旧版本是否实际读取该字段。 |
| `username` | `write['yuque-pwd'].username` | 保留旧 ENV 名。 |
| `password` | `write['yuque-pwd'].password` | 保留旧 ENV 名，以旧配置为准。 |
| `login` | `write['yuque-pwd'].login` | 原样迁移。 |
| `repo` | `write['yuque-pwd'].repo` | 原样迁移。 |
| `latexCode` | `write['yuque-pwd'].latexCode` | 有旧字段才迁移。 |
| `linebreak` | `write['yuque-pwd'].linebreak` | 原样迁移。 |
| `onlyPublic` | `write['yuque-pwd'].onlyPublic` | 原样迁移。 |
| `onlyPublished` | `write['yuque-pwd'].onlyPublished` | 原样迁移。 |
| `limit` | `write['yuque-pwd'].limit` | 下载并发数；有旧字段才迁移。 |

密码来源也要保留自身 `onlyPublic` / `onlyPublished` 的值，不从备用 Token 配置借用。

#### `fromFeishuWiki(options)`

0.x 的飞书来源按 `write.feishu.type` 拆成两个 1.x 来源插件。`type: 'wiki'`
迁移到 `fromFeishuWiki`。

| 1.x 字段 | 迁移来源 | 说明 |
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

| 1.x 字段 | 迁移来源 | 说明 |
| --- | --- | --- |
| `appId` | `write.feishu.appId` | 保留旧 ENV 名。 |
| `appSecret` | `write.feishu.appSecret` | 保留旧 ENV 名。 |
| `folderToken` | `write.feishu.folderToken` | 原样迁移。 |
| `baseUrl` | `write.feishu.baseUrl` | 空字符串可省略。 |
| `limit` | `write.feishu.limit` | 下载并发数；有旧字段才迁移。 |

### Local 目标插件

| 0.x | 1.x |
| --- | --- |
| `deploy.platform: 'local'` | `@elog/plugin-to-local` + `toLocal(options)` |

| 1.x 字段 | 迁移来源 | 说明 |
| --- | --- | --- |
| `outputDir` | `deploy.local.outputDir` | 原样迁移。 |
| `filename` | `deploy.local.filename` | 原样迁移，例如 `title`、`urlname`。 |
| `fileExt` | 新字段 | 默认 `md`，通常省略。 |
| `keepToc` | `deploy.local.catalog` | 旧 `catalog: true` 迁移为 `keepToc: true`。 |
| `frontMatter.enable` | `deploy.local.frontMatter.enable` 或旧 adapter 行为 | 见下方旧 `matter-markdown` / `formatExt` 的处理。 |
| `frontMatter.include` | `deploy.local.frontMatter.include` | 原样迁移。 |
| `frontMatter.exclude` | `deploy.local.frontMatter.exclude` | 原样迁移。 |

不要直接复制：

- `deploy.local.format`: `markdown` 或缺失时省略。旧 `matter-markdown` 转为 `frontMatter.enable: true`；若实际使用 `formatExt`，以扩展真正输出的内容为准。
- 旧 `formatExt` 调用 `matterMarkdownAdapter` 而配置未启用 Front Matter 时，新 `toLocal` 仍需启用 Front Matter；仅删除 adapter 调用会丢失文章元数据。
- `deploy.local.formatExt`: 改为 transform 插件。
- `deploy.local.catalog`: 改名为 `keepToc`。

### 图片 transform 插件

公共字段（所有图片插件）：

| 1.x 字段 | 说明 |
| --- | --- |
| `disable` | 禁用当前图片 transform。 |
| `limit` | 来自旧 `image.limit`，不是来源插件的下载并发数。 |
| `propertyImageFields` | 需要一并替换的 `doc.properties` 图片字段，例如 `['cover']`；当前支持 HTTP URL / data URL 字符串，不递归处理数组或对象。 |

平台映射：

| 0.x `image.platform` | 1.x 包 | import | factory |
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

| 1.x 字段 | 迁移来源 | 说明 |
| --- | --- | --- |
| `outputDir` | `image.local.outputDir` | 原样迁移。 |
| `prefixKey` | `image.local.prefixKey` 或旧默认值 | 非空值原样迁移；旧默认 `/`，1.x 默认 `./`，省略时需按旧行为显式设置。 |
| `pathFollowDoc.enable` | `image.local.pathFollowDoc` | 分层输出时旧 `true` 迁移为 `{ enable: true, docOutputDir }`；平铺输出见下文。 |
| `pathFollowDoc.docOutputDir` | `deploy.local.outputDir` | 文档输出目录，用于计算相对图片路径。 |
| `propertyImageFields` | 旧 `formatExt` 中处理的属性图片 | 例如 Notion cover 迁移为 `['cover']`。 |

`pathFollowDoc` 只用于本地图床相对路径。开启后 `prefixKey` 会失效，且需要保证
`pathFollowDoc.docOutputDir` 等于最终文档输出根目录，文档最终目录结构等于
`docOutputDir + docStructure`。如果目标是 `toLocal`，需要同时开启 `keepToc: true`；
`keepToc: false` 时相对路径应从输出根目录计算，可用 `prefixKey`（例如文档在
`./docs/docs-shorturl`、图片在 `./docs/images` 时用 `../images`）。不要为了满足图片
插件而把用户的平铺文档输出擅自改成分层目录。

旧 `pathFollowDoc: true` 若文档本来平铺输出，旧版通过实际 `docPath` 仍能计算正确链接；
直接迁移为 1.x 的目录跟随会按来源 `docStructure` 计算，可能产生错误路径。

#### `imageCos(options)`

字段：`secretId`、`secretKey`、`bucket`、`region`、`host`、`prefixKey`、`disable`、`limit`、`propertyImageFields`。

#### `imageOss(options)`

字段：`secretId`、`secretKey`、`bucket`、`region`、`host`、`prefixKey`、`disable`、`limit`、`propertyImageFields`；还接受对应 `ali-oss` 选项，例如 `stsToken`、`secure`、`endpoint`，以目标版本类型为准。

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

- `image.enable`: 按正文替换与扩展上传的实际使用方式选择 transform，见 `enableForExt` 说明。
- `image.plugin`: 改为官方图片插件或自定义 transform。
- `secretExt`: 改为 ENV 或自定义插件逻辑。
- `imagePathExt`: 优先用 `imageLocal.pathFollowDoc`，不足时自定义。

## 公开案例和实现核对入口

以下公开仓库已用于核对迁移场景，不代表所有 0.x 用户；私有仓库及未公开配置需要由当前用户提供访问上下文。案例中的业务逻辑要与当前用户的真实配置比较后再采用。

| 案例 | 可核对的迁移场景 |
| --- | --- |
| [elog-x/notion-hexo 配置](https://github.com/elog-x/notion-hexo/blob/ac8061b5c43568827919a7f7529489837cb12a73/elog.config.js)、[封面扩展](https://github.com/elog-x/notion-hexo/blob/ac8061b5c43568827919a7f7529489837cb12a73/format-image.js) | Notion 筛选、Hexo Front Matter、本地图床与 cover 上传。 |
| [elog-x/yuque-vitepress 配置](https://github.com/elog-x/yuque-vitepress/blob/01a8004f2c454fb3fa5715f6f2b759514d2d517d/elog.config.js)、[提示块扩展](https://github.com/elog-x/yuque-vitepress/blob/01a8004f2c454fb3fa5715f6f2b759514d2d517d/elog.format.js)、[短链接配置](https://github.com/elog-x/yuque-vitepress/blob/01a8004f2c454fb3fa5715f6f2b759514d2d517d/elog.config.shorturl.js) | 同时存在备用来源、部署扩展、分层 / 平铺输出、独立缓存。 |
| [Ymriri/Haven](https://github.com/Ymriri/Haven/blob/23b399e61cd11e9437de0802306bdb63812eca8d/package.json)、[同步 CI](https://github.com/Ymriri/Haven/blob/23b399e61cd11e9437de0802306bdb63812eca8d/.github/workflows/sync.yaml) | 真实用户沿用 0.x scripts、`-a`、`clean`、Node 18 与仅安装生产依赖的 CI。 |
| [0.x 社区实践列表](https://github.com/LetTTGACO/elog-docs/blob/db7b37a2fa377f3364bcc67a61fc5bef6e463cb3/docs/notion/ubcut43kgf97fag6.md) | 查找其他公开用户案例；是否仍使用 0.x 要读实际配置和依赖确认。 |

维护本指南时重点核对：

- 0.x：`master:packages/cli/src/run.ts`、`packages/cli/src/scripts/sync.ts`、`packages/core/src/client.ts`、`packages/deploy/src/adapter/index.ts` 和实际来源 / 图床实现。
- 1.x：[CLI 命令](../packages/cli/src/cli.ts)、[配置加载](../packages/core/src/config/load.ts)、[配置归一化](../packages/core/src/config/normalize.ts)、[缓存](../packages/core/src/cache/CacheStore.ts)、[transform 合约](../packages/plugin-contracts/src/plugin.ts)。
- 1.x：[Local 部署](../plugins/to/local/src/LocalDeploy.ts)、[本地图片路径](../plugins/transform/image-local/src/ImageClient.ts)、[属性图片处理](../packages/plugin-sdk/src/context-helpers/ImageContext.ts)、[Notion ID 解析](../plugins/from/notion/src/NotionApi.ts)、[语雀 Token 请求路径](../plugins/from/yuque-token/src/YuqueApi.ts)。
