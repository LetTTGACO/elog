# Elog npm 发布流程

Elog 1.0 通过 GitHub Actions 手动触发 Nx Release，并使用 npm Trusted Publishing
验证工作流身份。发布范围和版本规则由 `nx.json` 的 `release` 配置决定。

## 发布工作流

在 [Actions 的 Release 页面](https://github.com/LetTTGACO/elog/actions/workflows/release.yml)
选择 **Run workflow**，分支选择 `v1`。

| 输入      | 含义                                                  | 默认值 |
| --------- | ----------------------------------------------------- | ------ |
| `channel` | `beta` 发布预发布版本；`latest` 发布正式版本             | `beta` |
| `dry_run` | 预览版本、changelog 和包内容；关闭后才发布并推送 Git    | `true` |
| `version` | 可选的精确版本，例如首次转正式版时填写 `1.0.0` | 留空 |

工作流依次安装依赖、构建、检查类型、运行测试，然后执行现有的
`pnpm release:beta` 或 `pnpm release`。Nx 根据 Conventional Commits 为各包独立计算版本，
只发布有新版本的项目。真实发布成功后，工作流原子推送版本提交和包级 tag 到 `v1`。

`version` 留空时沿用独立版本计算。填写精确版本会将该版本应用到整个发布列表。
当前包仍处于 Beta 阶段，切换 `latest` 时必须显式填写正式版本；后续稳定版发布
可以留空继续按提交记录计算版本。

GitHub CLI 也可以触发预演：

```bash
gh workflow run release.yml --repo LetTTGACO/elog --ref v1 \
  -f channel=beta -f dry_run=true
```

检查预演结果后，将 `dry_run` 改为 `false` 触发真实发布。

## 发布报告

Actions 的 Summary 页面展示一份汇总报告，Markdown 由
`.github/scripts/release-report.mjs` 生成。Workflow 只负责调用脚本和传递步骤结果。

- 版本表列出每个包的当前版本、目标版本、版本变化依据及执行结果。
- 逐包折叠详情包含 Nx changelog、包级版本比较链接、包目录提交和计划标签。
- 验证表汇总依赖安装、构建、类型检查、测试、发布及 Git 推送的结果；未执行的
  CLI E2E 和真实平台 E2E 单独标明。
- Vitest 使用独立 reporter 输出逐包 JSON，再汇总通过、失败、跳过和未完成数量。
  没有测试文件的包显示零个文件，不计为有测试覆盖。
- 失败时仍生成已取得的数据；完整日志、版本计划、测试数据和 Markdown 保存到
  `release-report` artifact，保留 14 天。

执行模式与渠道分开显示：Beta 和稳定版都可以预演或真实发布。预演的版本数据来自
Nx 的只读版本计算和 changelog API；实际执行仍使用原有 Nx Release 命令。
预演成功表示检查和打包模拟通过，实际 npm 发布授权需在真实发布中验证。

预演和真实发布都会先只读查询 npm，展示渠道当前指向和目标版本是否已存在。
目标版本已存在、已发布基线缺少对应 Git tag，或 npm 查询失败时，版本计划步骤失败，
后续发布不会执行；全新包尚未发布的 manifest 基线可以正常回退。

真实发布完成后再次查询 npm，分别核验目标版本是否存在、dist-tag 是否匹配，并检查远端
`v1` 和包级标签。报告区分原已存在的版本、新出现的版本、缺失版本和无法确认的结果；
npm 发布与 Git 推送分别展示，部分失败时以逐包结果和恢复 artifact 为准。
包目录提交只是辅助视图，完整变更和版本计算以 Nx 数据为准。

本地检查报告逻辑：

```bash
node --test .github/scripts/release-report.test.mjs
```

## npm Trusted Publisher 配置

在每个发布包的 npm **Settings → Trusted publishing** 中添加 GitHub Actions：

| 字段                 | 值            |
| -------------------- | ------------- |
| Organization or user | `LetTTGACO`   |
| Repository           | `elog`        |
| Workflow filename    | `release.yml` |
| Environment name     | 留空          |
| Allowed actions      | 允许直接发布 `npm publish` |

Trusted Publisher 按包配置，完整列表以 `nx.json` 的 `release.projects` 为准。
当前需要配置以下 19 个包：

- `@elog/cli`
- `@elog/core`
- `@elog/plugin-sdk`
- `@elog/plugin-from-notion`
- `@elog/plugin-from-feishu-wiki`
- `@elog/plugin-from-feishu-space`
- `@elog/plugin-from-yuque-token`
- `@elog/plugin-from-yuque-pwd`
- `@elog/plugin-transform-image-local`
- `@elog/plugin-transform-image-cos`
- `@elog/plugin-transform-image-oss`
- `@elog/plugin-transform-image-github`
- `@elog/plugin-transform-image-qiniu`
- `@elog/plugin-transform-image-upyun`
- `@elog/plugin-transform-image-r2`
- `@elog/plugin-transform-image-b2`
- `@elog/plugin-transform-markdown-to-html`
- `@elog/plugin-to-local`
- `@elog/plugin-to-halo`

也可以使用 npm CLI 11.15.0 及以上版本，在交互登录并完成 2FA 后逐包配置：

```bash
npm trust github @elog/cli --repository LetTTGACO/elog \
  --file release.yml --allow-publish
```

配置其他包时替换包名。当前用于绕过 2FA 的发布 token 不能用于配置 Trusted Publisher。

发布运行在 GitHub 托管的 Ubuntu runner 上，具有 `id-token: write` 权限。
仓库使用的 pnpm 11.1.2 原生支持 OIDC 发布，Nx 的发布执行器调用 `pnpm publish`。
npm 通过仓库和工作流身份授权临时发布凭证，工作流无需配置 npm token secret。
包的 `repository.url` 应与 `LetTTGACO/elog` 一致。

## 默认分支与版本分支

仓库默认分支保持 `master`。为让 GitHub 显示手动运行入口，`master` 和 `v1`
都需要包含相同的 `.github/workflows/release.yml`。修改工作流后应同步两份文件。

每次运行都选择 `v1`。工作流会验证分支和仓库，并在发布前确认 `v1` 仍指向
本次运行的提交；等待期间分支有更新时，应启动新的预演和发布运行。
同一时间只运行一个发布任务。

## 迁移与验证

先把工作流同步到两个分支，再完成各包的 npm 授权。预演能验证构建、版本计算和
打包，但只有真实发布才能验证 npm 的 OIDC 授权。

首次 OIDC 发布成功后，再根据旧 token 对其他 scope 的用途缩小其授权范围或撤销。
本机 `~/.npmrc` 中的旧 token 不参与 GitHub Actions 发布。

## 失败恢复

真实发布步骤执行后，无论成功、失败或手动取消，工作流先保存恢复快照，再只读核验
npm 和 Git。快照位于 `release-report` 的 `recovery/`，包括版本计划、Git bundle、
未提交差异及包版本文件和 changelog；因此版本改写中途取消也能保留现场。
失败或取消时还会上传独立的 `release-recovery-运行编号-尝试编号` artifact，保存 7 天。

取消不会撤回已发布的 npm 版本。报告按实际查询结果展示已发布、目标版本缺失或
尚未确认的状态。核验最多运行 2 分钟，为后续上传留下时间。强制取消、runner 丢失或
超过 GitHub 的取消时限时，恢复步骤仍可能无法完成。

先下载 artifact 并核对 npm 实际发布的版本及 Git 记录。如果尚未发布任何目标版本，
且 `v1` 仍指向原提交，修复授权或网络问题后可以重跑同一次工作流。

如果部分或全部目标版本已上传，普通发布入口会因版本冲突而停止。应从 bundle 恢复
原始版本提交和 tag，核对已发布产物后，在该提交上继续发布缺失包，并推送对应 Git
记录；全部包已发布时只需修复 Git 记录。恢复期间保留原版本计划，避免重新计算版本。

## 普通 CI

Node 22 和 24 的 CI 除构建、类型检查、单元测试及发布报告测试外，还运行
`pnpm e2e:cli`。它使用临时目录和本地 fixture 验证版本查询、初始化预演、缺少配置
时的退出码及离线同步链路。真实平台同步用例仍通过各自的 E2E 命令手动执行。

参考：[npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)、
[npm trust](https://docs.npmjs.com/cli/v12/commands/npm-trust/)、
[GitHub 手动运行工作流](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)。
