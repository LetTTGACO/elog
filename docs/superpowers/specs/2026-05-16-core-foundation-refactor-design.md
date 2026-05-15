# Core Foundation Refactor Design

## Background

Elog 1.0 is still pre-release. That gives the project room to make breaking internal
changes before plugin and runtime APIs become public. The main compatibility
requirement is not the current 1.0 draft API; it is the public Elog 0.x user
configuration format.

The current architecture already has a good core idea: a Rollup-inspired plugin
pipeline customized for Elog's document sync workflow:

```text
download -> transform -> deploy
```

The next wave of work will include new CLI commands, larger refactors, and Elog
0.x config compatibility. Before that starts, the runtime, configuration pipeline,
plugin contract, and tests should be made explicit and stable.

## Goals

- Make workflow execution awaitable, testable, and free of core-level
  `process.exit()` calls.
- Separate raw user config from normalized runtime config.
- Reserve a clean boundary for Elog 0.x config detection, diagnostics, and future
  migration commands.
- Replace implicit plugin classification with an explicit plugin contract.
- Keep the Rollup-style plugin ergonomics while making Elog's own lifecycle clear.
- Add a minimal automated test harness around the core behavior most likely to
  break during future refactors.
- Establish internal source-code boundaries before considering package splitting
  or large plugin directory migrations.

## Non-Goals

- Do not implement the full Elog 0.x migration command in this phase.
- Do not preserve compatibility with unreleased 1.0 draft plugin APIs such as
  `this: PluginContext`.
- Do not split the monorepo into `core`, `cli`, and `plugin-kit` npm packages yet.
- Do not move all `playground/plugin-*` packages in the first phase.
- Do not rewrite every plugin beyond what is needed to satisfy the new contract.
- Do not build a broad integration test suite for every real external platform.

## Recommended Scope

This refactor should focus on four foundations:

1. Runtime orchestration
2. Configuration resolution
3. Plugin contract
4. Core tests and internal directory boundaries

Directory migration and package splitting should be treated as later cleanup once
the runtime and plugin contract are stable.

## Runtime Orchestration

### Current Issue

`node-entry.ts` starts workflows with `void graph.sync()`, so callers cannot reliably
await workflow completion or catch async failures. Some helpers call `process.exit()`
directly, which makes library usage, tests, future commands, and migration flows
hard to compose.

`PluginDriver.runHook()` currently catches hook errors and returns `new Error(...)`
as a normal value. That weakens fail-fast behavior and can allow later stages to
continue with invalid data.

### Target Model

Introduce a runtime layer that makes workflow execution explicit:

```text
CLI command
  -> config resolver
  -> WorkflowRunner
  -> Graph per workflow
  -> PluginDriver
  -> CacheStore
  -> WorkflowResult
```

`WorkflowRunner` should own multi-workflow execution. The first implementation
should run workflows serially by default for clearer logs, easier debugging, and
less cache/path interference. A future `--parallel` or `--continue-on-error` option
can be added at this layer.

`Graph` should focus on one normalized workflow:

```text
download hook
transform pipeline
cache update
deploy hooks
cache write
return result
```

### Workflow Results

Runtime should return structured results instead of exiting:

```ts
type WorkflowResult =
  | {
      status: 'success';
      workflowId: string;
      syncedCount: number;
      cacheFilePath: string;
    }
  | {
      status: 'skipped';
      workflowId: string;
      reason: 'disabled' | 'no-changes';
    }
  | {
      status: 'failed';
      workflowId: string;
      error: ElogError;
    };
```

The CLI decides how to print results and which exit code to use. The core runtime
should not terminate the process.

### CacheStore

Move cache read/write/update logic out of `Graph` into a small `CacheStore`.

Responsibilities:

- Load cache from the normalized cache path.
- Return an empty cache when disabled or missing.
- Update cached docs from doc status metadata.
- Write cache without document `body` content.
- Preserve `sortedDocList`.

This lets future commands inspect or migrate cache behavior without depending on
`Graph` internals.

### Hook Error Policy

The runtime should be fail-fast by default:

- `download` failure fails the workflow and prevents transform/deploy.
- `transform` failure fails the workflow and prevents deploy.
- `deploy` failure fails the workflow and records the target plugin that failed.
- Multi-workflow execution stops on first failure by default.

Future options can relax this, but the default should be predictable.

## Configuration Pipeline

### Current Issue

The current `ElogConfig` type acts as both user config and runtime config. That is
fine for the 1.0 draft plugin-object format, but it will not scale cleanly to Elog
0.x public config compatibility or future commands such as `migrate`, `doctor`, or
`config inspect`.

### Target Pipeline

Separate reading config from resolving config:

```text
load raw config
  -> detect config shape/version
  -> adapt supported public formats
  -> normalize defaults
  -> validate
  -> RuntimeWorkflowConfig[]
```

Suggested modules:

```text
src/config/
  load.ts
  resolve.ts
  normalize.ts
  validate.ts
  adapters/
    v1.ts
    legacy-v0.ts
```

`load.ts` should only find and load the user config file. It should not decide
runtime defaults.

`resolve.ts` should coordinate adapters, normalization, and validation.

### Runtime Config

The runtime should consume a normalized shape, not raw user config:

```ts
interface RuntimeWorkflowConfig {
  id: string;
  disabled: boolean;
  cache: CacheConfig;
  from: FromPlugin;
  transforms: TransformPlugin[];
  to: ToPlugin[];
  deployStrategy: 'serial' | 'parallel';
}
```

The first implementation can default `deployStrategy` to `serial` for simplicity
and debuggability. Parallel deploy can return later as an explicit strategy once
target plugins are guaranteed not to mutate shared docs.

### Elog 0.x Compatibility Boundary

This phase should create the boundary for Elog 0.x config compatibility without
implementing the full migration command.

Use adapters:

```ts
interface ConfigAdapter {
  name: string;
  canHandle(raw: unknown): boolean;
  normalize(raw: unknown): NormalizedConfig;
  diagnostics?: ConfigDiagnostic[];
}
```

The `legacy-v0` adapter can initially detect likely Elog 0.x config and produce a
clear diagnostic. A later migration feature can extend the same adapter with
migration planning and output generation.

The compatibility promise is for Elog 0.x public user config, not for unreleased
1.0 draft internals.

### Validation

Validation should report diagnostics before runtime execution:

- Exactly one `from` plugin.
- At least one `to` plugin.
- Every plugin has a valid `kind`.
- Plugin `kind` matches the hook it implements.
- Workflow IDs are unique.
- Cache paths are valid and unique enough for multi-workflow use.
- Elog 0.x config is detected and reported clearly when not yet executable.

These diagnostics can later be reused by `elog doctor`, `elog migrate --dry-run`,
or `elog config inspect`.

## Plugin Contract

### Design Principle

Because 1.0 has not shipped, the plugin API can be cleaned up without preserving
the current unreleased `this: PluginContext` style. The new contract should favor
explicit function parameters and discriminated plugin kinds.

### Plugin Types

Define plugins as a discriminated union:

```ts
type ElogPlugin = FromPlugin | TransformPlugin | ToPlugin;

interface BasePlugin {
  name: string;
  version?: string;
}

interface FromPlugin extends BasePlugin {
  kind: 'from';
  download(ctx: PluginContext): Promise<DownloadResult>;
}

interface TransformPlugin extends BasePlugin {
  kind: 'transform';
  transform(docs: DocDetail[], ctx: PluginContext): Promise<DocDetail[]>;
}

interface ToPlugin extends BasePlugin {
  kind: 'to';
  deploy(docs: DocDetail[], ctx: PluginContext): Promise<DeployResult | void>;
}
```

Plugin classification should use `kind`, not hook inference.

### Naming

Use namespace-style plugin names going forward:

```text
from:notion
from:yuque-token
transform:image-local
transform:image-github
to:local
to:halo
```

This improves diagnostics and makes hook errors easier to understand.

### Hook Model

Make Elog's lifecycle explicit:

```text
from.download      exactly one, serial, produces docs
transform hooks    zero or more, serial reducer, transforms docs
to.deploy          one or more, strategy-controlled, consumes final docs
```

`transform` must remain serial because each transform receives the previous
transform's output. `deploy` should initially be serial or receive isolated copies
of docs if parallel execution is enabled.

Method names in `PluginDriver` should reflect Elog's lifecycle instead of generic
hook categories:

```ts
runDownloadHook()
runTransformPipeline()
runDeployHooks()
```

### PluginContext

Replace the flat context with grouped capabilities:

```ts
interface PluginContext {
  workflow: WorkflowInfo;
  logger: Logger;
  http: HttpClient;
  cache: CacheReadonlyContext;
  image: ImageUtils;
}
```

Plugins should receive context explicitly:

```ts
async transform(docs, ctx) {
  const urls = ctx.image.getUrlListFromContent(docs[0].body);
  ctx.logger.info('image urls', String(urls.length));
  return docs;
}
```

No compatibility layer is needed for the unreleased `this: PluginContext` API.

### Plugin Errors

Plugin failures should be wrapped with context:

```ts
class ElogPluginError extends Error {
  pluginName: string;
  hookName: 'download' | 'transform' | 'deploy';
  cause?: unknown;
}
```

This lets CLI output say which plugin failed and during which lifecycle stage.

## Tests

### Test Framework

Add a lightweight automated test setup for `packages/elog`, such as Vitest. The
first test suite should focus on core behavior with mock plugins and fixture
configs. It should not call real external services.

### Required First Coverage

Config pipeline:

- Single workflow normalizes successfully.
- Multi-workflow configs get stable workflow IDs and cache defaults.
- Missing `from` or `to` produces diagnostics.
- Likely Elog 0.x config is detected and reported.

PluginDriver:

- Exactly one `from` plugin is required.
- `transform` plugins run in declaration order as a serial reducer.
- At least one `to` plugin is required.
- Hook errors are wrapped with plugin and hook metadata.

Runtime:

- Successful workflow returns `success`.
- No changed docs returns `skipped`.
- Download failure prevents transform/deploy.
- Transform failure prevents deploy.
- Deploy failure returns a failed workflow result.

Cache:

- `disableCache` forces full sync.
- `id + updateTime` detects new and updated docs.
- Previous `DOC_ERROR` or `IMAGE_ERROR` docs are retried.
- Written cache omits document `body`.

CLI smoke:

- `elog --help`
- `elog sync --config <fixture>`

## Internal Directory Boundaries

### First Phase

Keep a single published core package for now, but organize source code around
future boundaries:

```text
packages/elog/src/
  cli/
    commands/
      init.ts
      sync.ts
  config/
    load.ts
    resolve.ts
    normalize.ts
    validate.ts
    adapters/
      v1.ts
      legacy-v0.ts
  runtime/
    WorkflowRunner.ts
    Graph.ts
    PluginDriver.ts
    types.ts
  cache/
    CacheStore.ts
  plugins/
    context.ts
    errors.ts
    types.ts
  doc/
    filter.ts
    image.ts
  utils/
```

Dependencies should flow in one direction:

- `cli` calls `config` and `runtime`.
- `config` does not depend on `runtime` internals.
- `runtime` consumes `RuntimeWorkflowConfig`.
- `plugins` defines the plugin contract and context.
- `cache` handles cache persistence.
- `doc` contains document filtering and image replacement helpers.

### Later Phase

After the runtime and plugin contract stabilize, consider moving plugin packages:

```text
plugins/
  from/
    notion/
    yuque-token/
  transform/
    image-local/
    image-github/
  to/
    local/
    halo/
```

Do not combine this migration with the first foundation refactor unless necessary.

Package splitting can also wait:

```text
@elogx/cli
@elogx/core
@elogx/plugin-kit
```

Internal boundaries should prove themselves before becoming npm package
boundaries.

## Phased Rollout

### Phase 1: Foundation

- Introduce runtime result types and `WorkflowRunner`.
- Remove core-level `process.exit()` from the sync path.
- Make workflow execution awaitable.
- Extract `CacheStore`.
- Change plugin hooks to explicit `ctx` parameters.
- Require plugin `kind`.
- Add plugin error wrappers.
- Add config resolver modules and diagnostics.
- Add core tests for config, plugin driver, runtime, and cache.

### Phase 2: Plugin Migration

- Update all in-repo plugins to the new plugin contract.
- Normalize plugin names to namespace style.
- Update example configs and generated config templates.
- Add fixture-based CLI smoke tests.

### Phase 3: Legacy Config Support

- Expand `legacy-v0` adapter from detection to conversion where feasible.
- Design and implement `elog migrate`.
- Add migration dry-run diagnostics.
- Add fixtures for representative Elog 0.x config variants.

### Phase 4: Directory Cleanup

- Move plugin packages out of `playground` if the new contract has stabilized.
- Consider `plugin-kit` extraction only if real reuse pressure appears.

## Risks

- Refactoring runtime and plugin contracts together can create a large diff. Keep
  commits phased and test-backed.
- Elog 0.x config compatibility may reveal more variants than expected. Keep the
  first foundation phase focused on adapter boundaries and diagnostics.
- Changing deploy execution from parallel to serial may alter performance, but it
  improves predictability while the contract is being stabilized.
- Moving directories too early can obscure behavioral changes. Defer large package
  movement until tests pass and APIs settle.

## Success Criteria

- `pnpm build` still succeeds.
- Core tests cover config resolution, plugin execution order, runtime failures,
  and cache behavior.
- Runtime calls are awaitable and return structured results.
- No sync-path core helper calls `process.exit()` directly.
- Plugin hooks receive `ctx` as an explicit parameter.
- Plugin classification is based on `kind`.
- Config resolution can distinguish current 1.0 config from likely Elog 0.x
  public config and report clear diagnostics.
