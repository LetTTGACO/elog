# Elog 1.x 插件开发指南

这份指南面向需要修改同步内容、接入私有来源或部署到自有系统的开发者。先在项目内
编写和验证插件，需要跨项目复用时再整理成独立 ESM 包。

运行要求为 Node.js 22.13.0 或更高版本。本仓库为 1.x Beta，公开契约仍可能调整。
安装 CLI 时使用 `@elog/cli@beta`，确认实际版本为 1.x；已有项目沿用经过验证的版本
组合。插件从 `@elog/plugin-sdk` 导入类型和 helpers，用户配置的 `defineConfig`
从 `@elog/cli` 导入。

本文以当前 `v1` 分支实现为准；使用已发布包时，以所选版本的类型声明和实现为准。

## 选择切入点

| 需求 | 切入点 | 示例或配方 |
| --- | --- | --- |
| 字段改名、日期格式、发布状态 | transform | [属性转换](#属性转换) |
| 正文清理、追加页脚、替换链接 | transform | [追加页脚](../examples/plugin-development/src/append-footer.ts) |
| 不同目标需要不同格式或属性 | 目标的 `plugins` | [目标专属转换](#目标专属转换) |
| 从文件或私有 API 获取文档 | from | [JSON 来源](../examples/plugin-development/src/from-json.ts) |
| 只同步符合条件的文档 | 来源查询或来源插件 | [筛选文档](#筛选文档) |
| 发布到内部系统 | to | [文件部署](../examples/plugin-development/src/to-files.ts) |
| 使用自己的图片存储 | transform + `ImageUploader` | [自定义图片存储](#自定义图片存储) |

工作流顺序为：来源下载 → 公共转换 → 每个目标的专属转换 → 该目标部署。
多个目标默认串行，可配置 `deployStrategy: 'parallel'`；公共转换只执行一次，
目标专属转换按该目标的声明顺序执行。

## 在项目内写第一个插件

定制现有同步时，新增 `elog.plugins.ts`，从已有配置导入。安装与当前 1.x 工作流
兼容的 SDK；下面以本仓库的 SDK 版本为例：

```bash
pnpm add @elog/plugin-sdk@1.0.0-beta.3
```

`elog.plugins.ts`：

```ts
import type { TransformPlugin } from '@elog/plugin-sdk';

export function appendFooter(footer: string): TransformPlugin {
  return {
    name: 'transform:append-footer',
    kind: 'transform',
    async transform(docs) {
      return docs.map((doc) => ({ ...doc, body: `${doc.body}\n\n${footer}` }));
    },
  };
}
```

在已有 `elog.config.ts` 中导入，把下面的 `plugins` 填入已有 `defineConfig` 工作流，
保留原有来源、目标和其他插件：

```ts
import { appendFooter } from './elog.plugins';

const plugins = [appendFooter('版权说明')];
```

CLI 的配置加载器能够导入本地 TypeScript 文件。插件是普通对象；工厂函数接收选项，
返回带有 `name`、`kind` 和对应 Hook 的对象。`name` 出现在错误信息中，推荐使用
`from:*`、`transform:*`、`to:*`；它与 npm 包名、配置里的变量名分别独立。

需要完整可运行配置时，先从仓库根目录运行离线示例：

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm --filter @elog/example-plugin-development sync
```

输出和缓存位于 `examples/plugin-development/`，完整配置见
[elog.config.ts](../examples/plugin-development/elog.config.ts)。再次运行会跳过没有变化的
文档；修改 `documents.json` 的一篇正文并增大其 `updateTime` 后，只更新该篇。
详细步骤见[示例说明](../examples/plugin-development/README.md)。

## 文档模型

来源返回 `DocDetail`。下面是一篇最小的 Markdown 文档：

```ts
import type { DocDetail } from '@elog/plugin-sdk';

const doc: DocDetail = {
  id: 'article-42',
  title: '文章标题',
  updateTime: 1790985600000,
  body: '# 文章标题\n\n正文',
  bodyType: 'markdown',
  properties: { title: '文章标题', urlname: 'article-42' },
};
```

| 字段 | 约定 |
| --- | --- |
| `id` | 来源内唯一、跨次同步稳定，标题变化时保持不变 |
| `title` | 文档标题；来源通常同时填入 `properties.title` |
| `updateTime` | 来源更新时间，官方插件通常用毫秒时间戳；正文或所需属性变化时应变化 |
| `body` | 本次同步的完整正文 |
| `bodyType` | `markdown`、`html` 或 `confluence-wiki`，明确标注便于后续插件检查 |
| `properties` | 必须有 `title` 和 `urlname`，可携带标签、封面、发布状态等自定义属性 |
| `rawBody` / `rawBodyType` | 转换插件可保存转换前的正文及格式 |
| `docStructure` | 可选目录路径，具体目录构造可参考官方来源插件 |

Core 不会自动转换正文格式。官方 Markdown 转 HTML 插件把缺省 `bodyType` 当作
Markdown；自定义插件应声明接受的格式，转换格式时同步更新 `bodyType`。
扩展字段使用可克隆的数据值；目标隔离使用 `structuredClone`，函数或依赖自定义类
原型的对象不适合作为文档字段。API 客户端等运行时资源保存在插件闭包或实例中。

## 来源插件与增量缓存

来源 Hook 为 `download(ctx): Promise<DownloadResult>`。三个返回字段共同决定
待同步文档和缓存：

| 字段 | 内容 |
| --- | --- |
| `docDetailList` | 本次需要转换、部署的文档；增量来源仅返回新增和更新项 |
| `sortedDocList` | 当前同步范围的完整列表，包含未变化文档，至少有 `id` 和 `updateTime` |
| `docStatusMap` | 待同步文档 ID 对应的缓存状态和旧缓存位置 |

`sortedDocList` 虽然在接口上可选，但成功部署后的缓存写入只保留该列表包含的 ID。
省略它时按空列表写入，会得到空的文档缓存。实现增量来源时始终返回完整列表，包括
没有文档更新的运行；分页 API 要取完当前同步范围的所有页。完整列表用于保存来源顺序
和清理缓存，部署只接收 `docDetailList`。

状态包含 `_status` 和 `_updateIndex`：新文档用 `DocSyncStatus.NEW` 和 `-1`，更新
文档用 `DocSyncStatus.UPDATE` 和它在 `ctx.cache.docList` 中的位置。没有对应状态的
文档仍可部署，但不会加入或更新文档缓存。

推荐使用 `getDocDetailList`，让 SDK 计算状态。例如已有来源客户端提供两个回调时：

```ts
import {
  getDocDetailList,
  type FromPlugin,
  type GetDocDetail,
  type GetSortedDocList,
} from '@elog/plugin-sdk';

interface Summary {
  id: string;
  updateTime: number;
  properties: { title: string };
}

export function fromApi(
  listAll: GetSortedDocList<Summary>,
  downloadOne: GetDocDetail<Summary>,
): FromPlugin {
  return {
    name: 'from:api',
    kind: 'from',
    async download(ctx) {
      return getDocDetailList({
        cachedDocList: ctx.cache.docList,
        logger: ctx.logger,
        limit: 5,
        getSortedDocList: listAll,
        getDocDetail: downloadOne,
      });
    },
  };
}
```

列表项包含稳定 ID、更新时间和 `properties.title`，详情回调返回完整 `DocDetail`。
可直接参考[JSON 来源](../examples/plugin-development/src/from-json.ts)：它先读整份本地文件，
再由 SDK 选择待同步文档。远程 API 可先查元信息，再只请求新增、更新项的正文。

客户端需要继承辅助类时，使用 `ElogFromContext` 的 `this.docDetailList()`；它自动
传入缓存与日志，其他回调含义相同。参考
[Notion 客户端](../plugins/from/notion/src/NotionClient.ts)。简单来源直接用函数 helper 即可。

SDK 按 ID 和 `updateTime` 是否相等判断变化，缓存有 `DOC_ERROR` 或 `IMAGE_ERROR`
标记的文档也会重新下载。更新时间来自来源，避免每次用当前时间填充所有文档。
获取完整列表或详情失败时抛异常，避免把查询失败当成空来源。

### 缓存提供什么

`ctx.cache.docList` 的元素为 `CachedDoc`。磁盘缓存省略 `body` 和 `rawBody`，保留
ID、更新时间、属性、格式、目录等元信息。它用于增量比较，不能提供未变化文档的正文。
把它作为只读数据使用，包括嵌套属性；需要改变内容时构造自己的副本。

所有目标完成部署后才写入本次缓存。没有待同步文档时跳过转换与部署，但来源提供完整
列表时仍更新缓存，移除已离开同步范围的文档。缓存清理与目标删除是不同的行为；现有
生命周期没有独立删除 Hook，JSON/文件示例只创建和更新输出。

修改转换代码、插件选项或部署目标后，来源更新时间可能没有变化。需要重处理已有
文档时临时设置工作流顶层 `disableCache: true`，验证后恢复正常增量设置。
该选项禁用读取，成功同步仍写入缓存。修改同步范围时，建议为新范围使用独立缓存。

### 筛选文档

优先使用来源平台的查询条件。编写自己的来源时，在生成完整列表、计算增量状态前
筛选，确保完整列表与本次同步使用同一个范围。例如 JSON 示例：

```ts
fromJson({
  file: 'documents.json',
  include: (doc) => doc.properties.publish === true,
});
```

transform 可以改变内容、属性和顺序，但必须保持输入的 ID 集合、数量及唯一性，
运行时逐个 Hook 校验。因此筛选应在来源阶段完成。

## 转换插件配方

### 属性转换

保留现有字段，只修改需求涉及的属性。下面把 `summary` 映射到 `excerpt`，在来源
未指定时默认作为草稿，并使用 SDK 格式化发布日期：

```ts
import { formatTime, type TransformPlugin } from '@elog/plugin-sdk';

export const normalizeProperties: TransformPlugin = {
  name: 'transform:normalize-properties',
  kind: 'transform',
  async transform(docs) {
    return docs.map((doc) => ({
      ...doc,
      properties: {
        ...doc.properties,
        excerpt: doc.properties.excerpt ?? doc.properties.summary,
        publish: doc.properties.publish ?? false,
        date: doc.properties.date == null ? undefined : formatTime(doc.properties.date),
      },
    }));
  },
};
```

`date` 需为有效日期值。`formatTime` 默认使用 `Asia/Shanghai`，可通过 `TIME_ZONE`
环境变量调整。字段的最终格式和含义由部署目标决定。

### 目标专属转换

公共转换放在工作流顶层的 `plugins`。只针对一个目标的转换放在该目标插件的
`plugins` 中；自定义部署工厂应把选项暴露到返回的 `ToPlugin` 对象。离线示例可把
下面的数组填入工作流的 `to`：

```ts
const targets = [
  toFiles({ outputDir: 'output-a', plugins: [appendFooter('目标 A 的说明')] }),
  toFiles({ outputDir: 'output-b' }),
];
```

Core 给每个目标独立的文档副本，目标 A 的专属转换不会污染目标 B 或公共缓存。
目标之间不应依赖另一个目标的文件、文章或其他副作用。

### 自定义图片存储

`ImageUploader` 负责查重和上传，`ElogImageContext` 负责发现图片、下载、替换地址。
这个工厂接收你实现的存储适配器：

```ts
import {
  ElogImageContext,
  type ImageBaseConfig,
  type ImageUploader,
  type TransformPlugin,
} from '@elog/plugin-sdk';

export function imageStorage(
  uploader: ImageUploader,
  options: ImageBaseConfig = {},
): TransformPlugin {
  return {
    name: 'transform:image-storage',
    kind: 'transform',
    async transform(docs, ctx) {
      return new ElogImageContext(ctx, options).replaceImages(docs, uploader);
    },
  };
}
```

实现 `hasImage(filename)`：存在时返回公开图片 URL，否则返回 `null` 或 `undefined`。
实现 `uploadImage(filename, buffer, doc)`：上传二进制并返回公开图片 URL。
完整适配器参考 [R2 ImageApi](../plugins/transform/image-r2/src/ImageApi.ts)。
处理封面时传 `propertyImageFields: ['cover']`，图片转换放在 Markdown 转 HTML 之前。
Helper 默认扫描 Markdown 图片，失败处理包含跳过和保留原地址，部分失败会标记文档
供下次重试；它不是“一张图片失败就终止工作流”的严格模式。需要严格失败策略时，
由自己的 transform 校验上传结果并抛异常。

## 部署插件与宿主能力

部署 Hook 为 `deploy(docs, ctx)`，接收本次待同步文档，允许返回 `void`。
`DeployResult.deployedCount` 是可返回的统计字段，当前 Core 不读取此值；工作流的
`syncedCount` 按本次输入文档数统计。部署未完成时抛异常，不能仅返回较小计数表达失败。

按稳定文档 ID 实现创建或更新。某个目标失败后，本次缓存不会写入；已完成的目标不会
自动回滚，再次运行可能重复部署这些文档。文件示例覆盖同一 ID 对应的文件；CMS
适配器使用可查询的来源 ID 或目标 API 的幂等标识，避免重跑时重复新建文章。

| `PluginContext` 能力 | 行为 |
| --- | --- |
| `workflow` | 工作流 ID 与缓存路径，不是插件私有状态存储 |
| `logger` | `error(message)` 输出后抛异常，`warn` 用于允许继续的情况 |
| `http` | 返回 `{ status, headers, data }`，插件负责检查非成功 HTTP 状态 |
| `cache` | 文档元信息的只读视图 |
| `image` | 图片 URL、类型、下载及 Data URL 工具 |

HTTP 请求片段，变量由部署 Hook 提供：

```ts
const response = await ctx.http<{ id: string }>(url, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  data: payload,
  timeout: 30_000,
});
if (response.status < 200 || response.status >= 300) {
  throw new Error(`创建文章失败：HTTP ${response.status}`);
}
```

当前宿主 HTTP 客户端不会因 HTTP 错误状态自动抛出，也没有自动重试，网络错误可能
抛异常。按目标接口要求实现限流与重试。凭据从 env 作为工厂选项传入，调试及分享日志
时清除凭据。插件异常被包装为带 `pluginName`、`hookName` 和 `cause` 的错误，目标
专属转换错误还带 `targetPluginName`。插件不调用 `process.exit()`，也不依赖 Hook 的
`this` 绑定；宿主负责结果和 CLI 退出码。

文件路径通常相对于运行命令的工作目录。程序化调用时给自定义来源和目标传绝对路径；
`sync(config, { cwd })` 会解析缓存路径，不会替插件改写自己的路径选项。

## 离线验证自己的插件

先直接调用 Hook 验证内容变化和错误，再通过公开 `sync()` 跑完整工作流，检查缓存、
顺序与部署。运行时做身份校验和目标隔离，直接调用 Hook 不会覆盖这些行为。
[示例测试](../examples/plugin-development/src/plugins.test.ts)提供测试文档、最小 Context、
临时目录及完整集成流程。

测试 Context 的 `logger.error` 必须抛异常，与真实宿主一致。只测试正文转换时可以
省略未使用的图片实现；使用 HTTP 或图片功能时显式注入测试响应、二进制和上传结果。
测试工具保留在你的测试文件中即可。集成测试使用 Core 公开入口，把 Core 和 Vitest
放在插件项目的测试依赖中：

```ts
import { sync } from '@elog/core';

const results = await sync({
  cacheFilePath: '/absolute/test-workspace/cache.json',
  from: fromJson({ file: '/absolute/test-workspace/documents.json' }),
  plugins: [appendFooter('测试页脚')],
  to: toFiles({ outputDir: '/absolute/test-workspace/output' }),
});
```

配置错误抛出 `ElogConfigError`，运行时插件错误返回 `status: 'failed'`。检查结果状态
与实际输出，不能只看 Promise 正常返回。按插件职责选择必要的验证：

1. 首次同步生成预期内容和元信息。
2. 无变化时跳过转换、部署，单篇变化只更新对应输出。
3. 来源筛选、分页和删除后的完整列表与缓存一致。
4. 转换保留文档身份，目标专属转换只影响该目标。
5. 插件失败能定位，缓存不会前进，重跑不会重复创建目标内容。

在仓库中完成安装与构建后执行：

```bash
pnpm --filter @elog/example-plugin-development typecheck
pnpm --filter @elog/example-plugin-development test
pnpm e2e:offline
```

示例集成测试覆盖主要生命周期行为，离线 CLI 用例直接运行示例文件验证首次同步、
无变化和单篇更新。真实 CMS 插件还需在测试站点回读文章，检查正文、属性和发布状态；
本地模拟不能证明第三方服务的真实行为。

## 整理成独立插件包

跨项目复用时，复制追加页脚示例到 `src/index.ts`，建立这个独立包结构：

```text
elog-plugin-append-footer/
  src/index.ts
  package.json
  tsconfig.json
  tsdown.config.ts
```

`package.json` 示例：

```json
{
  "name": "elog-plugin-append-footer",
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=22.13.0" },
  "files": ["dist"],
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsdown",
    "typecheck": "tsc --noEmit --pretty false",
    "prepack": "pnpm run typecheck && pnpm run build"
  },
  "dependencies": { "@elog/plugin-sdk": "^1.0.0-beta.3" },
  "devDependencies": {
    "@types/node": "~22.19.19",
    "typescript": "~6.0.3",
    "tsdown": "^0.22.3"
  }
}
```

版本以本仓库为例，依赖范围按你验证的兼容版本设置。SDK 放在 `dependencies`，让
使用者获得类型和运行时 helper。独立包用普通 semver 范围，`workspace:^` 用于本仓库
内部插件；第三方包使用你自己的名称或 scope。

`tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "declaration": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
```

`tsdown.config.ts`：

```ts
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22.13.0',
  dts: true,
  fixedExtension: false,
  sourcemap: true,
});
```

在插件目录安装依赖并运行 `pnpm pack`，然后在另一个同步项目安装生成的 tarball：

```bash
pnpm add ../elog-plugin-append-footer/elog-plugin-append-footer-0.1.0.tgz
```

包里的工厂为默认导出，配置使用 `import appendFooter from 'elog-plugin-append-footer'`，
再将 `appendFooter('版权说明')` 加入工作流的 `plugins`。验证 tarball 的 ESM 入口、类型
声明和真实同步输出后，再决定是否发布到 npm。

插件 README 说明安装与兼容版本、配置示例、输入正文格式、选项、错误及重跑行为。
SDK 或协议更新后，重新验证实际支持的宿主组合；独立版本号不保证彼此兼容。

## 接入配置与进入初始化向导

配置直接导入插件对象即可运行，不需要向注册表登记。当前 `elog init` 和 `elog export`
从 CLI 内置注册表提供交互选择，发布 npm 包不会自动把它加入向导。贡献向导入口时，
另行更新[内置注册表](../packages/cli/src/registry/plugins.json)及选项 schema，并验证配置
生成、依赖安装和同步行为。

自用插件、独立包和官方插件遵循同一组生命周期契约。更多宿主用法见
[Core README](../packages/core/README.md)，配置流程见[配置指南](AI-CONFIG.md)。
