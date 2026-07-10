# @elog/plugin-sdk

Elog 1.0 的插件开发契约与运行时辅助工具。使用它可以为 Elog 编写来源、转换和部署插件，
而无需依赖 CLI 或 Core 的内部实现。

> Elog 1.0 目前处于 Beta 阶段，公开契约仍可能在正式版前调整。

## 安装

```bash
pnpm add @elog/plugin-sdk
```

插件在运行时可能使用 SDK 提供的 Context Helper，因此应将 `@elog/plugin-sdk` 放在插件包的
`dependencies` 中，而不是只放在 `devDependencies` 中。

## 插件类型

一个 Elog 工作流按照下面的顺序运行：

```text
from.download → transform.transform → to.deploy
```

| 类型        | `kind`      | Hook        | 职责                         |
| ----------- | ----------- | ----------- | ---------------------------- |
| 来源插件    | `from`      | `download`  | 下载文档并返回同步状态       |
| 转换插件    | `transform` | `transform` | 按声明顺序转换文档           |
| 部署插件    | `to`        | `deploy`    | 将最终文档写入一个目标       |

插件通常由一个工厂函数创建。下面是一个最小的转换插件：

```ts
import type { TransformPlugin } from '@elog/plugin-sdk';

export interface AppendFooterOptions {
  footer: string;
}

export default function appendFooter(options: AppendFooterOptions): TransformPlugin {
  return {
    name: 'transform:append-footer',
    kind: 'transform',
    async transform(docs, ctx) {
      ctx.logger.info('追加页脚', `${docs.length} 篇文档`);

      return docs.map((doc) => ({
        ...doc,
        body: `${doc.body}\n\n${options.footer}`,
      }));
    },
  };
}
```

## 插件契约

SDK 导出以下核心类型：

- `FromPlugin`、`TransformPlugin`、`ToPlugin` 和联合类型 `ElogPlugin`
- `PluginContext`、`DownloadResult` 和 `DeployResult`
- `DocDetail`、`DocProperties`、`DocStructure` 和 `BodyType`
- 图片上传相关的 `ImageUploader`、`ImageSource` 和 `ImageBaseConfig`

插件对象使用 `kind` 作为判别字段。`name` 建议使用 `from:*`、`transform:*` 或 `to:*` 的命名
形式，并与实际生命周期保持一致。

## PluginContext

每个 Hook 都会收到由 Elog 提供的 `PluginContext`：

| 字段       | 用途                                           |
| ---------- | ---------------------------------------------- |
| `workflow` | 当前工作流 ID 与缓存文件路径                   |
| `logger`   | 输出调试、信息、成功、警告或致命错误           |
| `http`     | 由 Elog 提供的 HTTP 请求客户端                 |
| `cache`    | 当前工作流的只读文档缓存                       |
| `image`    | 图片 URL、文件类型、下载和 Data URL 辅助方法   |

`ctx.logger.error(message)` 会输出错误并抛出异常，用于终止当前插件 Hook。插件代码不应调用
`process.exit()`，也不应依赖 Hook 的 `this` 绑定。

## Context Helper

SDK 还提供三个可选的基础类：

- `ElogBaseContext`：保存 `PluginContext`，适合封装插件客户端。
- `ElogFromContext`：为来源插件提供增量过滤、并发下载和详情组装能力。
- `ElogImageContext`：为图片转换插件提供图片发现、上传和地址替换能力。

简单插件可以直接使用 Hook 参数中的 `ctx`；只有在需要复用上述编排能力时才需要继承
Context Helper。

## 运行要求

- Node.js 22.13.0 或更高版本
- 仅支持 ESM
- TypeScript 插件建议使用显式的插件返回类型，让不完整的 Hook 在构建阶段失败

## 相关链接

- [Elog 仓库](https://github.com/LetTTGACO/elog)
- [报告问题](https://github.com/LetTTGACO/elog/issues)
