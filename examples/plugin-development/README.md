# 自定义插件离线示例

完整的开发路径、字段语义和独立包说明见[插件开发指南](../../docs/PLUGIN-DEVELOPMENT.md)。

这个私有 workspace 演示一个完整的自定义同步工作流：本地 JSON 来源 → 追加页脚 →
按稳定文档 ID 写入 Markdown 文件。使用 Node.js 22.13.0 或更高版本，无需平台凭据。

## 从仓库运行

在仓库根目录执行：

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm --filter @elog/example-plugin-development sync
```

输出位于本目录的 `output/hello.md` 和 `output/customization.md`，缓存为
`elog.cache.json`。再次运行 `sync` 会报告没有需要同步的文档，不再调用转换和部署。

修改 `documents.json` 中一篇文档的 `body`，并增大对应的 `updateTime`，然后再次运行：
只更新这篇文档的输出。`updateTime` 应来自来源的真实更新时间；正文或同步所需属性
变化时必须变化，否则增量来源不会重新下载它。

## 文件与职责

| 文件 | 职责 |
| --- | --- |
| [elog.config.ts](elog.config.ts) | 从本地文件导入三个插件并构造工作流 |
| [src/from-json.ts](src/from-json.ts) | 校验来源，使用 SDK 计算增量状态和完整来源列表 |
| [src/append-footer.ts](src/append-footer.ts) | 修改正文，保留文档身份和其他字段 |
| [src/to-files.ts](src/to-files.ts) | 校验正文格式，按稳定 ID 创建或更新文件 |
| [documents.json](documents.json) | 两篇固定文档，可自行修改 |
| [src/plugins.test.ts](src/plugins.test.ts) | Hook 单测和通过公开 `sync()` 运行的集成测试 |

JSON 示例会读入整个本地文件，再由 SDK 选择待同步文档。接入远程 API 时，可把
`getSortedDocList` 替换成完整的分页查询，把 `getDocDetail` 替换成单篇详情请求。

来源支持 `include`，在增量比较前筛选，例如：

```ts
fromJson({
  file: 'documents.json',
  include: (doc) => doc.properties.publish === true,
});
```

`toFiles` 支持目标专属的 `plugins`，用法见集成测试。它使用编码后的 ID 作为文件名，
重跑会覆盖原文件。来源删除或筛掉文档后会清理对应缓存；本示例部署插件只创建和更新
文件，原输出文件仍会保留。

## 离线验证

先完成上面的安装与构建，再从仓库根目录执行：

```bash
pnpm --filter @elog/example-plugin-development typecheck
pnpm --filter @elog/example-plugin-development test
pnpm e2e:offline
```

示例测试使用临时目录和公开的 SDK/Core API，覆盖首次同步、无变化跳过、单篇更新、
来源筛选、目标专属转换隔离、插件错误及部署失败后重跑。临时目录在测试后删除。

仓库的离线 E2E 会把这里的来源、转换、部署及配置文件复制进临时项目，使用真实 CLI
验证首次同步、无变化跳过和单篇更新。根目录的 `pnpm test` 也会执行示例测试。
