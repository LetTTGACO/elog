# E2E 测试

这个目录只维护端到端测试的运行入口和用例说明。测试规划、历史讨论、实现计划不放这里。

## 目录结构

- `cases/`：真实平台同步用例，每个目录代表一个 `from-to` 流程。
- `command-cases/`：CLI 命令级用例，不依赖真实平台账号。
- `src/`：Vitest runner 和断言 helper。
- `.env`：本地私密环境变量，不提交。
- `.tmp/`：本地调试输出，不提交。

当前保留的同步用例：

| 用例 | 作用 | 必需环境变量 |
| --- | --- | --- |
| `notion-to-local` | 测 Notion 下载和本地部署 | `ELOG_E2E_NOTION_TOKEN`, `ELOG_E2E_NOTION_DATABASE_ID` |
| `yuque-to-local` | 测语雀下载和本地部署 | `ELOG_E2E_YUQUE_USERNAME`, `ELOG_E2E_YUQUE_PWD`, `ELOG_E2E_YUQUE_LOGIN`, `ELOG_E2E_YUQUE_REPO` |
| `notion-to-wordpress` | 测 WordPress 部署 | `ELOG_E2E_NOTION_TOKEN`, `ELOG_E2E_NOTION_DATABASE_ID`, `ELOG_E2E_WORDPRESS_ENDPOINT`, `ELOG_E2E_WORDPRESS_USERNAME`, `ELOG_E2E_WORDPRESS_PASSWORD` |
| `notion-to-halo` | 测 Halo 部署 | `ELOG_E2E_NOTION_TOKEN`, `ELOG_E2E_NOTION_DATABASE_ID`, `ELOG_E2E_HALO_ENDPOINT`, `ELOG_E2E_HALO_TOKEN` |

如果某个用例缺少环境变量，Vitest 会跳过它。

## 环境变量

Vitest 启动时会读取当前目录的 `.env`。从仓库根目录通过 `pnpm e2e:*`
脚本运行时，当前目录是 `tests/e2e`，所以会读取 `tests/e2e/.env`。

运行器控制变量：

| 变量 | 作用 |
| --- | --- |
| `ELOG_E2E_CASE` | 只运行指定同步用例。通常由 `test:notion-local` 等脚本自动设置。 |
| `ELOG_E2E_STREAM_OUTPUT=true` | 同步时把真实 CLI stdout/stderr 实时输出到控制台，同时仍保留断言捕获。也兼容 `1`。 |
| `ELOG_E2E_KEEP_TMP=true` | 测试通过后也保留 `.tmp` 临时 workspace，便于调试产物。失败时默认会保留。也兼容 `1`。 |

平台凭据变量：

| 平台 | 变量 |
| --- | --- |
| Notion | `ELOG_E2E_NOTION_TOKEN`, `ELOG_E2E_NOTION_DATABASE_ID` |
| 语雀密码登录 | `ELOG_E2E_YUQUE_USERNAME`, `ELOG_E2E_YUQUE_PWD`, `ELOG_E2E_YUQUE_LOGIN`, `ELOG_E2E_YUQUE_REPO` |
| WordPress | `ELOG_E2E_WORDPRESS_ENDPOINT`, `ELOG_E2E_WORDPRESS_USERNAME`, `ELOG_E2E_WORDPRESS_PASSWORD` |
| Halo | `ELOG_E2E_HALO_ENDPOINT`, `ELOG_E2E_HALO_TOKEN` |
| R2 图床 | `ELOG_E2E_R2_HOST`, `ELOG_E2E_R2_ACCESS_KEY_ID`, `ELOG_E2E_R2_SECRET_ACCESS_KEY`, `ELOG_E2E_R2_BUCKET`, `ELOG_E2E_R2_ENDPOINT` |

R2 变量只在对应 case 的 `e2eProfile.image` 改成 `{ kind: 'r2' }` 时需要。

## 推荐运行方式

从仓库根目录运行：

```bash
pnpm e2e:cli
pnpm e2e:notion-local
pnpm e2e:yuque-local
pnpm e2e:notion-wordpress
pnpm e2e:notion-halo
```

跑完整 e2e：

```bash
pnpm e2e
```

进入 `tests/e2e` 也可以跑单个用例：

```bash
pnpm run test:notion-local
pnpm run test:yuque-local
pnpm run test:notion-wordpress
pnpm run test:notion-halo
```

手工调试某个配置：

```bash
cd tests/e2e
pnpm exec elog sync --config cases/notion-to-local/elog.config.ts --env .env
```

## 图床插件

图床配置放在每个 case 的 `elog.config.ts` 里，通过 `e2eProfile.image` 切换：

```ts
image: { kind: 'none' }
image: { kind: 'local', outputDir: 'images', prefixKey: '../images', expectFiles: true }
image: { kind: 'r2', expectFiles: false }
```

断言会根据 `e2eProfile.image` 自动调整：

- `none`：不检查图片输出。
- `local` 且 `expectFiles: true`：检查 `outputDir` 下至少有图片文件。
- `r2`：只检查同步流程成功，不检查本地图片文件。

所以你可以在 `elog.config.ts` 里临时改 `outputDir`、`prefixKey` 或图床类型；只要 `e2eProfile` 和插件参数保持一致，case 不会因为路径变化误报。

## 断言原则

同步用例只做轻断言：

- CLI 成功退出。
- 输出里出现同步结果。
- cache 文件存在且包含 `sortedDocList`。
- 本地部署用例检查 Markdown 文件存在。
- 本地图床用例检查图片文件存在。
- 第二次运行应命中无变化或跳过逻辑。

不要在端到端 case 里断言具体文件名、文章全文、图片 hash 或远端平台返回细节。这些内容太容易因为真实数据变化而误报。

## 新增用例

新增同步用例时，在 `cases/<from>-to-<to>/` 下放两个文件：

- `elog.config.ts`：真实 Elog 配置，并导出 `e2eProfile`。
- `case.ts`：声明必需环境变量、配置文件名和轻断言。

常用组合优先保持少量：

- 每个 `from` 至少有一个 `to-local` 用例。
- 非 local 的 `to` 平台默认用 Notion 作为来源。
- 图床插件不单独扩展成 case 矩阵，直接改对应 case 的 `e2eProfile.image`。
