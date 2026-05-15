# tsup → tsdown Migration Design

## Motivation

tsup 维护停滞，需要迁移到活跃维护的替代方案 tsdown（tsup 的精神继任者，基于 Rolldown）。

## Scope

一次性全量迁移 18 个构建包：

- `packages/elog` — 核心包
- 17 个 `playground/plugin-*` 插件包

`tests/test-elog` 无构建步骤，不涉及。

## Compatibility

输出完全兼容：`dist/` 目录结构、ESM-only 格式、`.d.ts` 声明文件、sourcemap 均不变。下游消费者无感知。

## Configuration Mapping

tsdown 的智能默认值覆盖了当前 tsup 配置的大部分选项，只需显式配置 `sourcemap`：

| tsup 配置 | tsdown 默认值 | 操作 |
|-----------|--------------|------|
| `entry: ['src/index.ts']` | 默认取 `src/index.ts` | 省略 |
| `format: ['esm']` | 默认 ESM | 省略 |
| `platform: 'node'` | 默认 `node` | 省略 |
| `dts: true` | 有 `types` 字段时自动启用 | 省略 |
| `clean: true` | 默认行为 | 省略 |
| `splitting: true` | Rolldown 默认处理 | 省略 |
| `sourcemap: true` | 默认 `false` | **保留** |

### 统一配置文件

所有 18 个包的 `tsdown.config.ts`：

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  sourcemap: true,
})
```

## Changes Per Package

每个包需要修改：

1. **删除** `tsup.config.ts`
2. **新增** `tsdown.config.ts`（如上）
3. **package.json** 修改：
   - `scripts.build`: `"tsup"` → `"tsdown"`
   - `devDependencies`: 移除 `tsup`，新增 `tsdown`

## Turborepo

`turbo.json` 无需修改——`build` task 只关心 `outputs: ["dist/**"]`，与构建工具无关。

## Validation

迁移完成后验证：

1. `pnpm build` 全量构建成功
2. 每个 `dist/` 目录输出 `.js`、`.d.ts`、`.js.map` 文件
3. `tests/test-elog` 运行正常

## Out of Scope

- 不启用 tsdown 新特性（`exports` 自动生成、CSS 支持、exe 等）
- 不修改 tsconfig 配置
- 不改变 monorepo 结构
