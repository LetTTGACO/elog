# Init And Export Command Split Design

## Goal

Split the current `elog init` experience into two command flows with different product
intentions:

- `elog init` is for users who want a long-term, editable automation setup.
- `elog export` is for one-time or beginner-friendly document export.

The existing init flow already knows how to select official plugins, install their packages, ask
for plugin options, and generate config/env files. This design keeps the useful registry and package
installation pieces, but separates persistent config generation from one-time runtime execution.

## Current State

`elog init` currently does all of this in one flow:

1. Select a source plugin, target plugins, and optional transform plugins.
2. Ask each selected plugin's option questions, including token/password fields.
3. Install selected plugin packages.
4. Generate `elog.config.ts`.
5. Generate `.env` and `.env.example`.
6. Offer to add `.env` to `.gitignore`.

That is convenient for a fully guided first setup, but it mixes two needs:

- A durable config file that users can edit and automate later.
- A one-shot export flow where users fill in credentials and immediately sync.

## Command Behavior

### `elog init`

`elog init` remains interactive, but only for plugin selection.

The flow is:

1. Choose one `from` plugin.
2. Choose one or more `to` plugins.
3. Choose zero or more `plugins`/transform plugins.
4. Install the selected plugin packages.
5. Generate only `elog.config.ts`.

It must not ask for plugin configuration fields such as token, password, output directory, repo, or
API URL. It must not generate `.env`, `.env.example`, or update `.gitignore`.

Generated config uses the registry schema to decide which fields to include:

- Fields with `x-elog-env` are always rendered as `process.env.NAME`.
- Fields without `x-elog-env` are rendered only when the schema defines a `default`.
- Fields without `x-elog-env` and without `default` are omitted.

Example:

```ts
export default defineConfig({
  from: fromYuque({
    token: process.env.YUQUE_TOKEN,
    login: process.env.YUQUE_LOGIN,
    repo: process.env.YUQUE_REPO,
    onlyPublic: false,
  }),
  to: toLocal({
    outputDir: './docs',
    keepToc: true,
  }),
});
```

`elog init --dry-run` remains available as a test and preview boundary. It prints the selected
install command and generated config text only. It no longer prints `.env`, `.env.example`, or
redacted environment output.

### `elog export`

`elog export` is a one-time guided sync command.

The flow is:

1. Choose one `from` plugin.
2. Choose one or more `to` plugins.
3. Choose zero or more `plugins`/transform plugins.
4. Ask selected plugins' option questions.
5. Install selected plugin packages.
6. Build an in-memory `ElogConfig`.
7. Call the existing runtime directly with that config.
8. Print workflow results using the same formatting as `elog sync`.

`elog export` must not write local config, env, cache, or helper files. To keep that promise, the
in-memory config should set `disableCache: true`. Runtime side effects from selected plugins are
still expected; for example, exporting to a local target writes exported documents because that is
the purpose of the command.

Sensitive values such as token/password are passed directly to plugin factories as option values.
They are not written to disk and are not assigned to `process.env`.

`elog export` does not support `--dry-run` in the first version. Manual testing is acceptable for
this user-facing path, while command behavior is covered with focused unit tests.

For command e2e coverage, `elog init --dry-run` may keep the existing non-interactive default
selection behavior: use the first available source plugin, no transforms, and the first available
target plugin from the registry. The normal `elog init` command remains interactive for plugin
selection.

## Architecture

### Shared Plugin Selection

Introduce a lighter selection type for commands that only need chosen plugins:

```ts
interface PluginSelection {
  from: PluginRegistryEntry;
  transforms: PluginRegistryEntry[];
  to: PluginRegistryEntry[];
}
```

Keep the existing answer-bearing selection shape for flows that collect options:

```ts
interface SelectedPlugin {
  entry: PluginRegistryEntry;
  answers: Record<string, unknown>;
}

interface InitSelection {
  from: SelectedPlugin;
  transforms: SelectedPlugin[];
  to: SelectedPlugin[];
}
```

`commands/init/wizard.ts` should expose two explicit flows:

```ts
runPluginSelectionWizard(registry): Promise<PluginSelection>
runExportWizard(registry): Promise<InitSelection>
```

`runPluginSelectionWizard` asks only the platform/plugin selection questions.
`runExportWizard` reuses that selection step and then asks option questions for the selected
plugins.

This keeps the main distinction visible in the API: init selects plugins; export selects plugins
and collects runtime options.

### Init Config Generation

`commands/init/generator.ts` keeps responsibility for TypeScript config text generation, but gains
a path that renders from `PluginSelection` and schema defaults.

The generator should produce:

- Imports for `defineConfig` and selected plugin packages.
- One `from` plugin call.
- Optional `plugins` array when transforms are selected.
- A single `to` plugin call or array, matching existing runtime config shape.
- No `.env` or `.env.example` content.

The existing generator helpers for object rendering can stay, but the input values are derived from
schema rules rather than user answers.

### Export Runtime Config Generation

Add `packages/elog/src/commands/export/`:

```text
packages/elog/src/commands/export/
  command.ts
  runtime-config.ts
  index.ts
```

`runtime-config.ts` converts `InitSelection` into an `ElogConfig` by dynamically importing each
selected plugin package and calling its default export with the collected answers. It sets
`disableCache: true` so the one-time export path does not create an `elog.cache.json` file.

At runtime:

```ts
const disableCache = true;
const from = fromFactory(selection.from.answers);
const plugins = transformFactories.map((factory, index) =>
  factory(selection.transforms[index].answers),
);
const to = targetFactories.map((factory, index) => factory(selection.to[index].answers));
```

If there is one target, `to` may be emitted as a single plugin for consistency with generated
config. Multiple targets use an array.

The dynamic import path uses `entry.packageName` from the registry. The registry still does not
bundle plugin runtime code; package installation ensures imports can resolve.

### Sync Result Reporting

`export` should not call `runSyncCommand()`, because that command owns config-file discovery and
dotenv loading. Instead, extract the result reporting and failed-result handling into a small shared
helper used by both sync and export.

The shape is:

```ts
const results = await elog(runtimeConfig);
reportWorkflowResults(results);
throwOnFailedWorkflow(results);
```

This preserves existing result text and failure behavior without pretending export has a config
file.

## Dependency Installation

Both `init` and `export` should automatically install selected plugin dependencies.

This is important for `init` because generated `elog.config.ts` imports plugin packages directly.
It is important for `export` because the target audience is one-time or beginner users who should
not need to manually install packages before exporting.

The existing package-manager detection and install helpers can be reused:

- Detect package manager from `packageManager`, lockfiles, then pnpm fallback.
- Build a unique package install command.
- Run package installation before config generation or runtime plugin import.

## Error Handling

`init` can continue to use `InitCommandError`, but the env/gitignore-specific paths are no longer
part of the active init flow.

`export` should use command-level errors with stable codes. A separate `ExportCommandError` is
preferred because export failures are not init failures:

- `EXPORT_PLUGIN_SELECTION_EMPTY`
- `EXPORT_PACKAGE_INSTALL_FAILED`
- `EXPORT_PLUGIN_IMPORT_FAILED`
- `EXPORT_PLUGIN_FACTORY_FAILED`

If the implementation reuses existing package install helpers, package installation may initially
surface as `PACKAGE_INSTALL_FAILED`. That is acceptable if the CLI output remains clear.

All errors remain process-boundary safe: runtime/library code does not call `process.exit()`, and
top-level CLI handling sets `process.exitCode`.

## Testing

Update tests around the new command split:

1. `init` wizard tests verify plugin selection does not call option prompts.
2. `init` command tests verify selected packages are installed.
3. `init` command tests verify only config writing is invoked.
4. `init` command tests verify `.env`, `.env.example`, and `.gitignore` writers are not part of the
   new flow.
5. Generator tests verify `x-elog-env` fields render as `process.env.NAME`.
6. Generator tests verify defaults render for ordinary fields.
7. Generator tests verify ordinary fields without defaults are omitted.
8. `init --dry-run` e2e expectations are updated to check only install command and config output.
9. Old e2e assertions for `.env`, `.env.example`, redacted env output, and `.gitignore` are removed
   or rewritten.
10. `export` unit tests mock registry, prompt answers, installation, dynamic import, and runtime
    invocation.
11. `export` tests verify sensitive values are passed directly as plugin options and are not written
    to files or assigned to `process.env`.
12. `export` tests verify generated runtime config sets `disableCache: true`.
13. `export` tests verify sync result reporting and failed workflow propagation match `sync`.
14. CLI tests verify the `export` command is registered.

`export` does not need an e2e dry-run path. Manual testing can cover the human flow after unit tests
prove the command orchestration.

## Migration Notes

This change intentionally removes generated `.env` and `.env.example` from init. Users who need
environment variables will see `process.env.NAME` in `elog.config.ts` and can create their own env
files or provide environment variables through their automation system.

Existing tests designed for the old all-in-one init flow should be treated as stale product
coverage. They should be edited or deleted according to the new command responsibilities rather than
kept alive through compatibility code.

## Non-Goals

- Do not add `export --dry-run` in the first version.
- Do not generate temporary config files for export.
- Do not write export credentials to disk.
- Do not assign export credentials to `process.env`.
- Do not write an export cache file.
- Do not change the runtime config shape.
- Do not dynamically load plugins during `elog sync`.
- Do not add a remote plugin registry.
