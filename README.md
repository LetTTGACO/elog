# Elog 1.x

Elog 把写作平台的文档同步到博客或 CMS。一个工作流由来源插件、按顺序执行的转换插件
和一个或多个部署插件组成：

```text
from.download → transform.transform → to.deploy
```

本分支为 Elog 1.x Beta，运行要求为 Node.js 22.13.0 或更高版本，公共包仅支持 ESM。
Beta 阶段安装 1.x CLI 时使用 `@beta`：

```bash
pnpm add -D @elog/cli@beta
pnpm exec elog init
pnpm exec elog sync
```

配置依赖 env 文件时，运行 `pnpm exec elog sync --env .env`。

## 使用与开发

- [配置指南](docs/AI-CONFIG.md)：选择来源、部署目标和图片处理方式，生成并验证配置。
- [插件开发指南](docs/PLUGIN-DEVELOPMENT.md)：从项目内的自定义插件到独立插件包。
- [可运行的插件示例](examples/plugin-development/README.md)：无需凭据的来源、转换、部署与离线验证。
- [Plugin SDK](packages/plugin-sdk/README.md)：公开契约与来源、图片处理辅助工具。
- [Core](packages/core/README.md)：通过公开 API 嵌入同步工作流。
- [CLI](packages/cli/README.md)：初始化、导出和同步命令。
- [E2E](tests/e2e/README.md)：离线验证和真实平台同步测试。

## 仓库开发

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
pnpm e2e:offline
```

包代码位于 `packages/`，官方插件位于 `plugins/from/`、`plugins/transform/` 和
`plugins/to/`。自定义插件可以直接从配置导入本地文件或 npm 包。
