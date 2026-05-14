# Rush → pnpm workspaces + Turborepo + changesets 迁移设计

## 背景

当前项目使用 Rush 5.118.7 管理 monorepo，包含 18 个 TypeScript 包（1 个核心 + 16 个插件 + 1 个测试包）。Rush 的大部分高级功能（build cache、version policies、subspaces、cobuild、approved packages 等）均未启用，日常使用仅涉及：PNPM workspace 编排、增量构建、change log 校验、pre-commit prettier hook。

痛点：安装体积大、启动慢、配置繁琐（10+ 配置文件）、与 Claude Code/Codex 等工具链不兼容、企业级功能完全用不到。

## 目标架构

```
elog-1.0/
├── pnpm-workspace.yaml          # workspace 声明
├── turbo.json                    # 构建编排配置
├── package.json                  # 根 package.json (devDeps: turbo, changeset, husky, lint-staged)
├── .changeset/                   # changesets 配置
├── packages/
│   └── elog/                     # 核心包
├── playground/
│   ├── plugin-from-*/            # from 插件
│   ├── plugin-image-*/           # image 插件
│   └── plugin-to-*/             # to 插件
└── tests/
    └── test-elog/                # 测试包
```

## 技术选型

| 功能 | Rush（旧） | 新方案 |
|------|-----------|--------|
| 包管理器 | Rush 管理的 pnpm 8.7.6 | pnpm 11.1.2（`packageManager` 字段锁定） |
| workspace 编排 | `rush.json` | `pnpm-workspace.yaml` |
| 构建编排 | `rush build` / `rush rebuild` | `turbo build` / `turbo build --force` |
| 版本/发布管理 | `rush change` + `rush publish` | changesets |
| Git hooks | Rush git-hooks + autoinstallers | husky + lint-staged |
| 增量构建缓存 | 无（buildCacheEnabled: false） | Turborepo 内置本地缓存 |

## turbo.json 构建编排

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

- `dependsOn: ["^build"]` — 拓扑序构建，先构建依赖包
- `outputs: ["dist/**"]` — 缓存 dist/ 目录，未变更包直接从缓存恢复

### 命令对照

| 操作 | Rush | Turborepo |
|------|------|-----------|
| 安装依赖 | `rush install` | `pnpm install` |
| 增量构建 | `rush build` | `turbo build` |
| 全量重建 | `rush rebuild` | `turbo build --force` |
| 单包构建 | `rushx build` | `pnpm --filter @elogx-test/elog build` |

## Git Hooks：husky + lint-staged

替代 Rush 的 `common/git-hooks/` + `common/autoinstallers/rush-prettier/`。

安装：

```bash
pnpm add -Dw husky lint-staged
pnpm exec husky init
```

根 `package.json` 配置：

```json
{
  "lint-staged": {
    "*.{ts,js,json,md}": "prettier --write"
  }
}
```

`.husky/pre-commit`：

```bash
pnpm exec lint-staged
```

`.husky/commit-msg`：保留现有 2 词校验逻辑。

## CI Pipeline 迁移

```yaml
# 旧
- node common/scripts/install-run-rush.js change --verify
- node common/scripts/install-run-rush.js install
- node common/scripts/install-run-rush.js rebuild --verbose --production

# 新
- pnpm install --frozen-lockfile
- npx changeset status --since=origin/1.0-dev
- pnpm turbo build --force
```

## pnpm 版本升级

从 8.7.6 升级到 11.1.2。关键注意点：

- Node.js 18.12+ 要求 — 项目已用 18.16.0，兼容
- `workspace:*` 协议 — pnpm 11 完全支持，无变化
- lockfile 格式变化 — 需全量 `pnpm install` 重新生成
- 根 `package.json` 添加 `"packageManager": "pnpm@11.1.2"` 锁定版本

## 迁移步骤

1. **新增配置文件** — `pnpm-workspace.yaml`、`turbo.json`、根 `package.json` 添加 devDependencies
2. **修改每个包的 package.json** — 移除 `//` 注释字段（Rush 特有），确认 `workspace:*` 兼容
3. **设置 husky + lint-staged** — 替代 Rush git hooks
4. **设置 changesets** — `pnpm add -Dw @changesets/cli && pnpm changeset init`
5. **更新 CI** — 修改 `.github/workflows/ci.yml`
6. **删除 Rush 基础设施** — 移除 `common/`、`rush.json`、Rush 相关文件
7. **重新生成 lockfile** — 删除旧 `pnpm-lock.yaml`，`pnpm install` 重新生成
8. **验证** — `pnpm install && turbo build` 全量构建通过
9. **更新 IntelliJ run configurations** — `rush build` → `turbo build`

## 需要删除的文件/目录

| 目标 | 说明 |
|------|------|
| `rush.json` | Rush 主配置 |
| `common/` | 整个目录（config、scripts、git-hooks、autoinstallers、temp） |
| `.nvmrc` 中 Node 版本 | 确认与 pnpm 11 兼容（已兼容） |
| 各包 `package.json` 中的 `//` 字段 | Rush 专有注释字段 |

## 风险点

- **pnpm 大版本升级**：从 8.x 到 11.x 有 breaking changes，需全量测试
- **workspace 协议**：`workspace:*` 在 pnpm 11 下完全兼容，无需改动
- **IntelliJ run configurations**：`.run/` 中 6 个配置需从 `rush build` 更新到 `turbo build`
- **changeset 迁移**：现有 CHANGELOG.md/CHANGELOG.json 需评估是否保留历史
