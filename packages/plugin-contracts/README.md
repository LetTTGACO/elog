# @elog/plugin-contracts

Elog Core 与插件共同遵守的文档、生命周期和宿主能力协议。Core 和 Plugin SDK 分别
依赖此包，插件作者通常通过 `@elog/plugin-sdk` 获取同一份协议的转导出。

```text
@elog/cli → @elog/core ───────────┐
                                ├→ @elog/plugin-contracts
各插件 → @elog/plugin-sdk ───────┘
```

## 内容

- 文档结构、正文格式、同步状态及 `DocSyncStatus` 常量
- 来源、转换和部署插件接口与生命周期输入输出
- `PluginContext` 及日志、HTTP、只读缓存、图片能力的类型

Core 实现宿主能力和工作流运行；SDK 提供 Context Helper、增量过滤、并发下载、
图片替换及其配置和回调类型。协议只在 contracts 中定义，SDK 保持既有公开导入方式。

## 直接使用

程序化集成需要直接声明协议时，可以安装此包：

```bash
pnpm add @elog/plugin-contracts
```

```ts
import { DocSyncStatus, type FromPlugin } from '@elog/plugin-contracts';

const from: FromPlugin = {
  name: 'from:example',
  kind: 'from',
  async download() {
    return {
      docDetailList: [
        {
          id: 'example',
          title: 'Example',
          updateTime: 1,
          body: '# Example',
          properties: { title: 'Example', urlname: 'example' },
        },
      ],
      sortedDocList: [{ id: 'example', updateTime: 1 }],
      docStatusMap: { example: { _updateIndex: -1, _status: DocSyncStatus.NEW } },
    };
  },
};
```

## 运行与兼容性

上面的例子每次返回全文，用于展示协议结构。实现增量来源时，建议使用 SDK 的
`getDocDetailList` 或 `ElogFromContext`，根据宿主缓存计算待下载列表与同步状态。

`docDetailList` 是本次待同步文档，`sortedDocList` 是当前同步范围的完整文档列表。
后者虽然为可选字段，但缓存写入仅保留其中的 ID；成功部署时省略它会写出空的文档缓存。
需要增量同步的来源应始终返回完整列表，包括没有待更新文档的运行。

`ctx.cache.docList` 使用 `CachedDoc`，保留 ID、更新时间、属性等元信息；持久化时省略
`body` 和 `rawBody`，插件不能依赖缓存提供正文。SDK 同样转导出此类型。

仅支持 ESM，Node.js 22.13.0 或更高版本。公开图片协议使用 Node.js `Buffer`，
因此包依赖 `@types/node` 来解析声明文件；运行时仅导出协议常量。

当前处于 Beta 阶段，协议保持独立版本。协议演进需要同时检查 Core 与插件兼容性；
SDK 的工具实现可在保持协议不变的情况下独立更新。
