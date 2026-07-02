# Elog 0.x 到 1.0 AI 迁移手册

这份文档写给执行迁移的 AI。目标不是解释 Elog 的完整历史，而是让你在一个用户的 0.x 项目里，把支持范围内的配置迁移到 Elog 1.0。

## 给 AI 的第一原则

- 只迁移本文明确支持的路径：Notion / 语雀 Token / 语雀账号密码 -> Local -> 官方图片插件。
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
- `deploy.platform: 'local'`
- `image.platform`: `local`、`cos`、`oss`、`github`、`qiniu`、`upyun`、`r2`、`b2`

不支持作为本轮迁移目标：

- 来源：Feishu、FlowUs、Wolai、Outline 或其他来源。
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

1. 0.x 项目通常依赖 `@elog/cli`。1.0 配置需要核心包和具体插件包。
2. 按实际用到的插件添加依赖，不要一次装全平台插件。
3. 当前 1.0 包名按本文映射使用 `@elogx-test/*`。如果未来官方包名变化，以 [LetTTGACO/elog](https://github.com/LetTTGACO/elog) 最新实现为准。

最小依赖示例：

```json
{
  "devDependencies": {
    "@elogx-test/elog": "latest",
    "@elogx-test/plugin-from-notion": "latest",
    "@elogx-test/plugin-image-local": "latest",
    "@elogx-test/plugin-to-local": "latest"
  }
}
```

## ENV 迁移规则

保留旧 ENV 名。例如旧配置这样写：

```js
token: process.env.NOTION_TOKEN,
databaseId: process.env.NOTION_DATABASE_ID,
```

新配置继续这样写：

```ts
token: process.env.NOTION_TOKEN,
databaseId: process.env.NOTION_DATABASE_ID,
```

只生成 example：

```dotenv
NOTION_TOKEN=
NOTION_DATABASE_ID=
```

不要读取、复制或重写用户真实 `.env` 里的值。最终提醒用户手动把敏感值迁移到新运行环境。

## 常见场景模板

### Notion -> Local -> Local Images

```ts
import { defineConfig } from '@elogx-test/elog';
import fromNotion from '@elogx-test/plugin-from-notion';
import imageLocal from '@elogx-test/plugin-image-local';
import toLocal from '@elogx-test/plugin-to-local';

export default defineConfig({
  cacheFilePath: 'elog.cache.json',
  from: fromNotion({
    token: process.env.NOTION_TOKEN,
    dataSourceId: process.env.NOTION_DATA_SOURCE_ID,
    databaseId: process.env.NOTION_DATABASE_ID,
    filter: { property: 'status', select: { equals: '已发布' } },
  }),
  plugins: [
    imageLocal({
      outputDir: './source/images',
      prefixKey: './images',
      propertyImageFields: ['cover'],
    }),
  ],
  to: toLocal({
    outputDir: './source/_posts',
    filename: 'title',
    frontMatter: {
      enable: true,
      include: ['categories', 'tags', 'title', 'date', 'updated', 'permalink', 'cover', 'description'],
    },
  }),
});
```

### 语雀 Token -> Local -> COS Images

```ts
import { defineConfig } from '@elogx-test/elog';
import fromYuque from '@elogx-test/plugin-from-yuque-token';
import imageCos from '@elogx-test/plugin-image-cos';
import toLocal from '@elogx-test/plugin-to-local';

export default defineConfig({
  cacheFilePath: 'elog.cache.json',
  from: fromYuque({
    token: process.env.YUQUE_TOKEN,
    login: process.env.YUQUE_LOGIN,
    repo: process.env.YUQUE_REPO,
    onlyPublic: false,
    onlyPublished: true,
  }),
  plugins: [
    imageCos({
      secretId: process.env.COS_SECRET_ID,
      secretKey: process.env.COS_SECRET_KEY,
      bucket: process.env.COS_IMAGE_BUCKET,
      region: process.env.COS_IMAGE_REGION,
      host: process.env.COS_HOST,
      prefixKey: 'elog-docs-images',
    }),
  ],
  to: toLocal({
    outputDir: './docs/yuque',
    filename: 'urlname',
    frontMatter: { enable: true },
  }),
});
```

### 语雀账号密码 -> Local -> Local Images

```ts
import { defineConfig } from '@elogx-test/elog';
import fromYuque from '@elogx-test/plugin-from-yuque-pwd';
import imageLocal from '@elogx-test/plugin-image-local';
import toLocal from '@elogx-test/plugin-to-local';

export default defineConfig({
  cacheFilePath: 'elog.cache.json',
  from: fromYuque({
    username: process.env.YUQUE_USERNAME,
    password: process.env.YUQUE_PWD,
    login: process.env.YUQUE_LOGIN,
    repo: process.env.YUQUE_REPO,
    onlyPublic: false,
    onlyPublished: true,
  }),
  plugins: [
    imageLocal({
      outputDir: './docs/images',
      pathFollowDoc: {
        enable: true,
        docOutputDir: './docs/docs',
      },
    }),
  ],
  to: toLocal({
    outputDir: './docs/docs',
    filename: 'title',
    keepToc: true,
    frontMatter: { enable: true },
  }),
});
```

## 0.x 专用扩展点迁移

### `formatExt`

0.x 的 `deploy.local.formatExt` 在部署前处理文档。1.0 的 `toLocal` 不再接收 `formatExt`；把逻辑迁移到 transform 插件。

如果旧 `formatExt` 只是替换正文：

```ts
import type { DocDetail, TransformPlugin } from '@elogx-test/elog';

export default function customFormat(): TransformPlugin {
  return {
    name: 'transform:custom-format',
    kind: 'transform',
    async transform(docs: DocDetail[]) {
      return docs.map((doc) => ({
        ...doc,
        body: doc.body
          ?.replaceAll(':::tips', ':::tip')
          .replaceAll(':::success', ':::tip'),
      }));
    },
  };
}
```

在 config 中使用：

```ts
import customFormat from './elog.transforms';

export default defineConfig({
  from: fromYuque({}),
  plugins: [
    customFormat(),
    imageLocal({ outputDir: './docs/images' }),
  ],
  to: toLocal({ outputDir: './docs/docs', filename: 'title' }),
});
```

### `imagePathExt`

优先判断 1.0 `imageLocal.pathFollowDoc` 是否足够：

```ts
imageLocal({
  outputDir: './docs/images',
  pathFollowDoc: {
    enable: true,
    docOutputDir: './docs/docs',
  },
});
```

如果旧 `imagePathExt` 需要按标题、属性或其他复杂规则动态计算图片路径，官方 `imageLocal` 字段可能不够。此时不要硬塞字段；改写自定义图片插件或 transform 插件。

### `secretExt`

0.x 的 `secretExt` 用来动态处理图床密钥。1.0 迁移时不要照搬：

- 普通密钥：改成 `process.env.X`。
- 动态签名或临时凭证：写自定义插件逻辑。
- 不要把 `secretExt` 路径继续放进官方图片插件配置。

### `image.plugin`

0.x 的 `image.plugin` 不等价于 1.0 的稳定字段。迁移顺序：

1. 如果能对应官方图片插件，用官方插件。
2. 如果只是正文替换，用自定义 transform 插件。
3. 如果是完整自定义上传逻辑，写自定义图片 transform 插件。

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
| `write.platform: 'notion'` | `@elogx-test/plugin-from-notion` | `fromNotion` | `fromNotion(options)` |
| `write.platform: 'yuque'` | `@elogx-test/plugin-from-yuque-token` | `fromYuque` | `fromYuque(options)` |
| `write.platform: 'yuque-pwd'` | `@elogx-test/plugin-from-yuque-pwd` | `fromYuque` | `fromYuque(options)` |

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
| `password` | `write['yuque-pwd'].password` | 保留旧 ENV 名，例如 `YUQUE_PWD` 或 `YUQUE_PASSWORD` 以旧配置为准。 |
| `login` | `write['yuque-pwd'].login` | 原样迁移。 |
| `repo` | `write['yuque-pwd'].repo` | 原样迁移。 |
| `latexCode` | `write['yuque-pwd'].latexCode` | 有旧字段才迁移。 |
| `linebreak` | `write['yuque-pwd'].linebreak` | 原样迁移。 |
| `onlyPublic` | `write['yuque-pwd'].onlyPublic` | 原样迁移。 |
| `onlyPublished` | `write['yuque-pwd'].onlyPublished` | 原样迁移。 |
| `disableCache` | `extension.disableCache` | 推荐迁移到顶层。 |
| `cacheFilePath` | `extension.cachePath` | 推荐迁移到顶层。 |
| `limit` | `write['yuque-pwd'].limit` | 下载并发数；有旧字段才迁移。 |

### Local 目标插件

| 0.x | 1.0 |
| --- | --- |
| `deploy.platform: 'local'` | `@elogx-test/plugin-to-local` + `toLocal(options)` |

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
| `local` | `@elogx-test/plugin-image-local` | `imageLocal` | `imageLocal(options)` |
| `cos` | `@elogx-test/plugin-image-cos` | `imageCos` | `imageCos(options)` |
| `oss` | `@elogx-test/plugin-image-oss` | `imageOss` | `imageOss(options)` |
| `github` | `@elogx-test/plugin-image-github` | `imageGithub` | `imageGithub(options)` |
| `qiniu` | `@elogx-test/plugin-image-qiniu` | `imageQiniu` | `imageQiniu(options)` |
| `upyun` | `@elogx-test/plugin-image-upyun` | `imageUpyun` | `imageUpyun(options)` |
| `r2` | `@elogx-test/plugin-image-r2` | `imageR2` | `imageR2(options)` |
| `b2` | `@elogx-test/plugin-image-b2` | `imageB2` | `imageB2(options)` |

#### `imageLocal(options)`

| 1.0 字段 | 迁移来源 | 说明 |
| --- | --- | --- |
| `outputDir` | `image.local.outputDir` | 原样迁移。 |
| `prefixKey` | `image.local.prefixKey` | 原样迁移。 |
| `pathFollowDoc.enable` | `image.local.pathFollowDoc` | 旧值为 `true` 时迁移为 `{ enable: true, docOutputDir }`。 |
| `pathFollowDoc.docOutputDir` | `deploy.local.outputDir` | 文档输出目录，用于计算相对图片路径。 |
| `propertyImageFields` | 旧 `formatExt` 中处理的属性图片 | 例如 Notion cover 迁移为 `['cover']`。 |

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
