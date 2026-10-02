# Elog 1.x AI 配置指南

这份指南供 AI Agent 为用户配置 Elog 1.x。根据用户的文档来源、发布目标和图片处理需求，
安装所需依赖，生成配置与环境变量模板，并验证同步结果。用户可以把本文交给 Agent，
同时说明“从哪里同步、同步到哪里、图片如何保存”。

本文使用 1.x 的插件 API。执行时以用户选定版本的包类型和实现为准；在仓库中查阅源码时，
使用 `v1` 分支。各插件的详细选项通过本文中的链接按需查阅。

## 配置流程

1. 读取用户项目的 `package.json`、锁文件、同步脚本和已有 Elog 配置，确认包管理器、
   Node 版本及命令工作目录。修改已有文件时保留用户的其他内容。
2. 确认文档来源及范围、部署目标、筛选条件、图片存储方式；本地目标还需确认输出目录、
   文件名属性、Front Matter 和目录结构。已能从项目中确定的内容直接沿用，缺少的再询问。
3. 按本文的插件清单选择依赖，逐包查询并锁定兼容的已发布 1.x 版本。
4. 生成 `elog.config.ts`、环境变量模板、同步脚本和必要的忽略规则。只安装配置实际引用的包。
5. 核对配置的导入、必填字段、转换顺序、路径和环境变量名。配置加载成功只是静态验证，
   平台权限和输出正确性需要实际同步验证。
6. 在用户授权的输出目录、站点及图床范围内运行同步，检查文档、图片和目标平台内容；
   再次运行验证增量同步。如果尚缺凭据或运行授权，交付配置并明确记录未验证的步骤。

完成后向用户说明生成或修改了哪些文件、安装了哪些版本、如何填写环境变量、如何运行，
以及实际验证到了哪一步。

## 运行环境与版本选择

CLI 要求 Node.js `>=22.13.0`。CLI 和插件是 ESM 包；推荐使用 `elog.config.ts`，也可以
使用 `.mjs`。TypeScript 配置由 CLI 加载，不要求用户项目额外安装 TypeScript，也不要求
修改整个项目的 `package.json.type`。

先查询 CLI 和所选插件的发布信息，例如 Notion 到 Local：

```bash
npm view @elog/cli dist-tags --json
npm view @elog/cli versions --json
npm view @elog/plugin-from-notion dist-tags --json
npm view @elog/plugin-to-local dist-tags --json
npm view @elog/plugin-transform-image-local dist-tags --json
```

选择已发布的 1.x 版本，包括用户接受的 1.x Beta；标签只是查找入口，最终依赖使用确切版本。
默认 `latest` 标签不保证指向 1.x。各包独立发布，CLI 与插件的版本号可以不同。
对选定版本继续查询 `engines` 和 `dependencies`，确认运行环境及依赖兼容性。

以下以 pnpm 项目为例。将尖括号占位替换为查询到的确切版本后执行：

```bash
pnpm add -D --save-exact \
  '@elog/cli@<CLI_VERSION>' \
  '@elog/plugin-from-notion@<NOTION_VERSION>' \
  '@elog/plugin-to-local@<LOCAL_VERSION>' \
  '@elog/plugin-transform-image-local@<IMAGE_LOCAL_VERSION>'
pnpm exec elog --version
```

沿用用户的 npm、pnpm、Yarn 或 Bun，并更新对应锁文件。npm 项目使用
`npm exec -- elog ...`，Yarn 项目使用 `yarn elog ...`，Bun 项目使用 `bun run elog ...`。
确认执行的是项目安装的 1.x CLI。

CLI 会自动安装其依赖的 Core。普通配置从 `@elog/cli` 导入 `defineConfig`，无需另行声明
Core 或 SDK。自定义插件引用 `@elog/plugin-sdk` 时，才为其增加直接依赖。
若同步环境只安装生产依赖，应将运行所需的 CLI、插件和自定义代码依赖放入 `dependencies`。

## 工作流配置

一个工作流由一个来源、可选转换插件和一个或多个部署目标组成：

```text
from → 工作流 plugins → 每个目标的独立文档副本 → 目标 plugins → to
```

官方插件均使用默认导出工厂，调用工厂后把插件实例放入配置。工作流层面的选项如下：

| 字段             | 用途                                     | 默认值                        |
| ---------------- | ---------------------------------------- | ----------------------------- |
| `id`             | 非空且唯一的工作流名称                   | `workflow-1`、`workflow-2` 等 |
| `from`           | 一个来源插件实例，必填                   | —                             |
| `plugins`        | 公共转换插件数组，按顺序执行             | `[]`                          |
| `to`             | 一个目标插件实例或非空目标数组，必填     | —                             |
| `deployStrategy` | 目标分支执行方式：`serial` 或 `parallel` | `serial`                      |
| `cacheFilePath`  | 当前工作流的缓存路径                     | 单工作流为 `elog.cache.json`  |
| `disableCache`   | 跳过缓存读取，执行全量同步               | `false`                       |
| `disable`        | 跳过整个工作流                           | `false`                       |

公共转换的结果供所有目标使用。目标配置中的 `plugins` 只转换该目标的文档副本，
例如本地目标保留 Markdown，Halo 目标单独转换为 HTML。
`deployStrategy` 控制目标转换与部署的串行或并行执行；即使串行，各目标也不能通过
修改自己的文档副本影响其他目标。

## 完整示例 Notion 到本地 Markdown

此例将文档写入项目根目录的 `docs`，图片写入 `images`，正文引用 `../images/<文件名>`。
把路径替换为用户博客或文档站实际需要的目录。

`elog.config.ts`：

```ts
import { defineConfig } from '@elog/cli';
import fromNotion from '@elog/plugin-from-notion';
import imageLocal from '@elog/plugin-transform-image-local';
import toLocal from '@elog/plugin-to-local';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`缺少环境变量：${name}`);
  return value;
}

export default defineConfig({
  id: 'notion-local',
  cacheFilePath: 'elog.cache.notion-local.json',
  from: fromNotion({
    token: requiredEnv('NOTION_TOKEN'),
    dataSourceId: requiredEnv('NOTION_DATA_SOURCE_ID'),
  }),
  plugins: [
    imageLocal({
      outputDir: 'images',
      prefixKey: '../images',
      propertyImageFields: ['cover'],
    }),
  ],
  to: toLocal({
    outputDir: 'docs',
    filename: 'urlname',
    frontMatter: { enable: true },
  }),
});
```

`requiredEnv` 是示例中的本地辅助函数，用于检查必填变量。来源插件会补充 `urlname`，
按它命名文件可以避免标题修改引起文件名变化；需要按标题命名时设为 `filename: 'title'`。

`.env.elog.example`：

```dotenv
NOTION_TOKEN=
NOTION_DATA_SOURCE_ID=
```

让用户将变量填入本地 `.env` 或运行环境。模板与配置可以进入 Git，真实密钥文件需要加入
忽略规则。已有环境变量名称直接沿用，模板只列实际使用的变量，不填写真实敏感值。

CLI 只在显式指定 `-e` 时加载 env 文件；未指定时使用系统环境变量。
指定 env 文件会覆盖同名系统环境变量。运行命令：

```bash
pnpm exec elog sync -c elog.config.ts -e .env
```

## 选择来源插件

以下是当前对外发布的来源插件。它们输出 Markdown，并提供文档属性和可用的目录信息。
表中的工厂名是建议的默认导入变量名，可以在配置中自行命名。

| 来源         | 包与说明                                                                 | 工厂名            | 必填选项                                             |
| ------------ | ------------------------------------------------------------------------ | ----------------- | ---------------------------------------------------- |
| Notion       | [@elog/plugin-from-notion](../plugins/from/notion/README.md)             | `fromNotion`      | `token`，以及 `dataSourceId` / `databaseId` 至少一个 |
| 语雀 Token   | [@elog/plugin-from-yuque-token](../plugins/from/yuque-token/README.md)   | `fromYuqueToken`  | `token`、`login`、`repo`                             |
| 语雀账号密码 | [@elog/plugin-from-yuque-pwd](../plugins/from/yuque-pwd/README.md)       | `fromYuquePwd`    | `username`、`password`、`login`、`repo`              |
| 飞书云空间   | [@elog/plugin-from-feishu-space](../plugins/from/feishu-space/README.md) | `fromFeishuSpace` | `appId`、`appSecret`、`folderToken`                  |
| 飞书 Wiki    | [@elog/plugin-from-feishu-wiki](../plugins/from/feishu-wiki/README.md)   | `fromFeishuWiki`  | `appId`、`appSecret`、`wikiId`                       |

### Notion

准备 Integration Token，并将目标数据库授权给该 Integration。推荐传入 `dataSourceId`；
提供 `databaseId` 时，插件会读取数据库并使用第一个可用的 data source。

默认不增加过滤条件。`filter: true` 要求数据源存在名为 `status` 的 **Select** 属性，
并只读取值为 `已发布` 的页面。用户使用其他属性名称、Notion Status 类型或其他条件时，
应按实际属性结构传入 `filter` 对象。

`sorts` 用于查询排序。需要按属性生成目录时，设置
`catalog: { enable: true, property: '<目录属性名>' }`；属性应为 Select 或 Multi-select，
并配合本地目标的 `keepToc: true`。

### 语雀

对于知识库地址 `https://www.yuque.com/example-team/example-book`，`login` 是
`example-team`，`repo` 是 `example-book`。筛选公开与已发布文档分别使用 `onlyPublic`
和 `onlyPublished`，均按用户需求设置。

以下片段使用上文的 `requiredEnv`，将生成的 `from` 填入工作流。优先使用 Token 模式：

```ts
import fromYuqueToken from '@elog/plugin-from-yuque-token';

const from = fromYuqueToken({
  token: requiredEnv('YUQUE_TOKEN'),
  login: requiredEnv('YUQUE_LOGIN'),
  repo: requiredEnv('YUQUE_REPO'),
  onlyPublished: true,
});
```

用户选择账号密码模式时：

```ts
import fromYuquePwd from '@elog/plugin-from-yuque-pwd';

const from = fromYuquePwd({
  username: requiredEnv('YUQUE_USERNAME'),
  password: requiredEnv('YUQUE_PASSWORD'),
  login: requiredEnv('YUQUE_LOGIN'),
  repo: requiredEnv('YUQUE_REPO'),
  onlyPublished: true,
});
```

账号密码模式依赖语雀网页登录接口；需要验证码或额外身份验证的账号可能无法使用。

### 飞书

先准备自建应用的 App ID 和 App Secret，开通读取对应空间、文档及图片资源的权限，
并确认应用能访问目标范围。云空间使用文件夹 Token，Wiki 使用知识库 ID；
Wiki 的可选 `folderToken` 是限定同步子树的节点 Token。

云空间来源片段：

```ts
import fromFeishuSpace from '@elog/plugin-from-feishu-space';

const from = fromFeishuSpace({
  appId: requiredEnv('FEISHU_APP_ID'),
  appSecret: requiredEnv('FEISHU_APP_SECRET'),
  folderToken: requiredEnv('FEISHU_SPACE_FOLDER_TOKEN'),
});
```

Wiki 来源片段：

```ts
import fromFeishuWiki from '@elog/plugin-from-feishu-wiki';

const from = fromFeishuWiki({
  appId: requiredEnv('FEISHU_APP_ID'),
  appSecret: requiredEnv('FEISHU_APP_SECRET'),
  wikiId: requiredEnv('FEISHU_WIKI_ID'),
});
```

需要限定 Wiki 子树时增加 `folderToken`；只在用户希望跳过包含子文档的父级文档时设置
`disableParentDoc: true`。飞书正文图片会先转换为 Data URL，通常应增加图片转换插件，
生成目标平台可用的图片地址。

## 配置本地输出

[Local 插件](../plugins/to/local/README.md)把正文写入文件。常用选项如下：

| 选项                              | 用途                                         |
| --------------------------------- | -------------------------------------------- |
| `outputDir`                       | 必填，文档输出目录，相对于运行命令的工作目录 |
| `filename`                        | 取哪个文档属性作为文件名，默认 `title`       |
| `fileExt`                         | 文件后缀，不带点，默认 `md`                  |
| `keepToc`                         | 按来源的 `docStructure` 创建目录，默认关闭   |
| `frontMatter.enable`              | 将文档属性写入 YAML Front Matter             |
| `frontMatter.include` / `exclude` | 选择输出的 Front Matter 属性                 |
| `plugins`                         | 仅用于这个目标的转换插件数组                 |

文件名属性为空时使用包含文档 ID 的默认名称。文件名保留字符会替换，同一次部署的重名
文档会追加文档 ID。Front Matter 使用 `properties`，文件名所用属性始终保留。

先确认博客框架需要哪些属性，再设置 `include` 或 `exclude`。来源的 YAML Front Matter
或 Notion 属性可以提供 `tags`、`categories`、`cover` 等字段；字段改名或值转换可以用
自定义 transform 处理。

`fileExt` 只控制后缀。需要输出 HTML 文件时，在目标的 `plugins` 中使用
[Markdown 转 HTML 插件](../plugins/transform/markdown-to-html/README.md)的
`markdownToHtml()`，同时设置 `fileExt: 'html'`。

## 配置图片处理

需要长期保存正文图片时，选择一个图片插件。默认处理 Markdown 图片；通过
`propertyImageFields: ['cover']` 可以同时处理封面等字符串图片属性。
图片转换应放在 Markdown 转 HTML 之前，因为图片插件扫描的是 Markdown 图片语法。

| 图片存储      | 包与说明                                                                           | 关键选项                                                       |
| ------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 本地          | [@elog/plugin-transform-image-local](../plugins/transform/image-local/README.md)   | `outputDir`、`prefixKey`，按目录输出时用 `pathFollowDoc`       |
| 腾讯云 COS    | [@elog/plugin-transform-image-cos](../plugins/transform/image-cos/README.md)       | `secretId`、`secretKey`、`bucket`、`region`                    |
| 阿里云 OSS    | [@elog/plugin-transform-image-oss](../plugins/transform/image-oss/README.md)       | `secretId`、`secretKey`、`bucket`、`region`                    |
| GitHub        | [@elog/plugin-transform-image-github](../plugins/transform/image-github/README.md) | `user`、`token`、`repo`，确认 `branch`                         |
| 七牛云        | [@elog/plugin-transform-image-qiniu](../plugins/transform/image-qiniu/README.md)   | `secretId`、`secretKey`、`bucket`、`region`、`host`            |
| 又拍云        | [@elog/plugin-transform-image-upyun](../plugins/transform/image-upyun/README.md)   | `bucket`、`user`、`password`，配置公开 `host`                  |
| Cloudflare R2 | [@elog/plugin-transform-image-r2](../plugins/transform/image-r2/README.md)         | `accessKeyId`、`secretAccessKey`、`bucket`、`endpoint`、`host` |
| Backblaze B2  | [@elog/plugin-transform-image-b2](../plugins/transform/image-b2/README.md)         | `applicationKeyId`、`applicationKey`、`bucket`、`host`         |

各图床的 `host` 格式与区域值规则不同，生成配置前读取所选插件的说明。图床 API 地址用于
上传，公开地址用于正文展示；验证时确认生成的地址可以被目标站点读者访问。

### 本地图片路径

区分写入磁盘的目录和写回正文的地址。例如 `docs/post.md` 引用 `images/a.png` 时，
实际图片位于 `docs/images/a.png`；图片位于项目根目录的 `images/a.png` 时，正文应引用
`../images/a.png`。博客框架可能使用站点根路径，应按框架的静态资源规则设置 `prefixKey`。

开启 `keepToc: true` 后，嵌套文档的相对路径深度不同。替换上例的图片插件选项：

```ts
imageLocal({
  outputDir: 'images',
  prefixKey: '../images',
  pathFollowDoc: {
    enable: true,
    docOutputDir: 'docs',
  },
  propertyImageFields: ['cover'],
});
```

`docOutputDir` 要与 Local 的 `outputDir` 一致。缺少目录信息时回退到 `prefixKey`。
同一个公共本地图片转换结果通常只适用于相同的文档输出目录；不同目录的 Local 目标应将
各自的本地图片转换放入目标 `plugins`，分别计算引用路径。

## 完整示例 同时部署到 Local 和 Halo

[Halo 插件](../plugins/to/halo/README.md)需要 Halo 2 站点根地址、可管理文章及分类标签的
个人令牌，以及 HTML 正文。此例用 R2 处理公共图片，再让 Local 输出 Markdown、Halo
单独转换 HTML。增加对应的 R2、Halo 和 Markdown 转 HTML 插件依赖。

```ts
import { defineConfig } from '@elog/cli';
import fromNotion from '@elog/plugin-from-notion';
import imageR2 from '@elog/plugin-transform-image-r2';
import markdownToHtml from '@elog/plugin-transform-markdown-to-html';
import toLocal from '@elog/plugin-to-local';
import toHalo from '@elog/plugin-to-halo';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`缺少环境变量：${name}`);
  return value;
}

export default defineConfig({
  id: 'notion-local-halo',
  cacheFilePath: 'elog.cache.notion-local-halo.json',
  from: fromNotion({
    token: requiredEnv('NOTION_TOKEN'),
    dataSourceId: requiredEnv('NOTION_DATA_SOURCE_ID'),
  }),
  plugins: [
    imageR2({
      host: requiredEnv('R2_PUBLIC_HOST'),
      accessKeyId: requiredEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requiredEnv('R2_SECRET_ACCESS_KEY'),
      bucket: requiredEnv('R2_BUCKET'),
      endpoint: requiredEnv('R2_ENDPOINT'),
      prefixKey: 'elog/images',
      propertyImageFields: ['cover'],
    }),
  ],
  to: [
    toLocal({
      outputDir: 'docs',
      filename: 'urlname',
      frontMatter: { enable: true },
    }),
    toHalo({
      endpoint: requiredEnv('HALO_ENDPOINT'),
      token: requiredEnv('HALO_TOKEN'),
      plugins: [markdownToHtml()],
    }),
  ],
});
```

对应的环境变量模板：

```dotenv
NOTION_TOKEN=
NOTION_DATA_SOURCE_ID=
R2_PUBLIC_HOST=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_ENDPOINT=
HALO_ENDPOINT=
HALO_TOKEN=
```

R2 的 `endpoint` 是 S3 API 地址，`host` 是图片的公开访问根地址。Halo 的 `endpoint`
是站点根地址。Halo 按文档 ID 创建或更新文章，`properties.title` 与 `urlname` 必填；
`tags`、`categories`、`cover`、`excerpt` 等属性用于文章元信息。

Halo 的 `properties.publish` 默认是 `true`。首次试同步前，按用户意图在来源属性或
自定义 transform 中设定发布状态；`publish: false` 会同步为未发布状态。
Halo 图片使用公开的绝对地址，其部署插件不会替用户把本地图片上传到站点。

## 多工作流与缓存

同一来源的一次下载需要送到多个目标时，使用上例的 `to` 数组。不同来源或不同同步范围
使用工作流数组，传给 `defineConfig([工作流一, 工作流二])`，每项仍包含自己的 `from`
和 `to`。为每项设置唯一 `id` 和独立 `cacheFilePath`。

多个工作流按声明顺序串行运行，遇到失败停止；`disable: true` 的工作流被跳过。
多工作流未显式设置缓存时，默认使用 `elog.cache1.json`、`elog.cache2.json` 等。
显式命名可以避免重排工作流后串用缓存。不同配置文件中的工作流也应使用不同缓存路径。

缓存与输出路径相对于运行命令的工作目录解析。缓存文件的父目录需已存在；新项目可以
直接使用根目录下的 `elog.cache.<用途>.json`。

首次没有缓存时全量同步，后续按文档身份和更新时间增量下载。缓存保存文档元信息及
排序列表，省略正文。没有变化时跳过转换和部署。

修改图片、转换、文件名或部署目标后，源文档更新时间可能没有变化。需要重处理已有文档时，
临时设置工作流顶层 `disableCache: true` 或使用新缓存。`disableCache` 只禁用读取，
同步仍会写入指定缓存；验证完成后恢复正常增量配置。

Local 与 Halo 同步新增和更新文档；来源删除文档后，已有本地文件或 Halo 文章需另行清理。

## 按需添加自定义转换

需要修改属性名称、日期格式、发布状态或正文时，把自定义 transform 放在单独的
`elog.transforms.ts`，从配置导入。引用 SDK 类型时安装兼容的 `@elog/plugin-sdk`。

例如，只在文档没有指定发布状态时默认作为草稿：

```ts
import type { TransformPlugin } from '@elog/plugin-sdk';

export const defaultDraft: TransformPlugin = {
  name: 'transform:default-draft',
  kind: 'transform',
  async transform(docs) {
    return docs.map((doc) => ({
      ...doc,
      properties: {
        ...doc.properties,
        publish: doc.properties.publish ?? false,
      },
    }));
  },
};
```

把 `defaultDraft` 放在 Halo 目标的 `plugins` 中、`markdownToHtml()` 之前。
转换必须保持文档 ID 集合、数量及 ID 唯一性；只修改需要的正文或属性，保留其他字段。
详细契约见 [Plugin SDK](../packages/plugin-sdk/README.md)。

## 运行入口与验证

在 `package.json.scripts` 中增加同步入口，保留现有脚本：

```json
{
  "elog:sync": "elog sync -c elog.config.ts -e .env"
}
```

从项目根目录运行 `pnpm run elog:sync`。CI 已用 Secrets 注入系统环境变量时，使用
`pnpm exec elog sync -c elog.config.ts`，并确认 CI 的 Node 版本与安装的依赖范围满足要求。
需要跨次运行增量同步时，持久化对应的工作流缓存。

`elog init` 可交互生成基础配置并安装插件；Agent 也可以直接按本文生成文件。
`elog init --dry-run` 仅预览默认初始化结果，不会检查已有配置。
`sync` 的选项是 `-c/--config`、`-e/--env` 和 `--debug`，没有同步预演或独立配置检查命令。
运行 `sync` 会实际写文件、上传图片或部署远程文章。

按以下顺序验证：

1. **静态核对**：CLI 版本为选定的 1.x，配置引用的包已声明，必填选项与 env 模板一致，
   路径符合运行目录，图片转换位于 HTML 转换之前，各工作流的缓存独立。
2. **首次同步**：使用用户指定的目标；需要先试跑时使用独立本地输出目录、新缓存及
   用户授权的测试站点或图床路径。检查有预期文档实际输出，空来源不算有效的内容验证。
3. **内容检查**：核对正文、Front Matter、文件名和目录，打开正文图片及 cover 地址。
   Halo 还需检查文章标题、Slug、正文、封面、分类标签及发布状态。
4. **增量检查**：没有源端修改时再次运行，应该报告没有需要同步的文档；修改一篇测试文档
   后再次运行，确认该文档的输出更新。博客项目继续运行已有构建命令，检查渲染结果。

CLI 遇到工作流失败时返回非零退出码。定位问题时按配置加载、来源下载、图片转换、正文
转换和目标部署的顺序排查，结合错误中的插件与 hook 信息。需要日志时使用 `--debug`，
分享日志前清除敏感内容。

交付时区分“配置已生成”“依赖与静态检查通过”“同步及内容已验证”。有待填写的凭据、
未执行的远程部署或未验证的博客构建应逐项说明。
