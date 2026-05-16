# Init Command Plugin Registry Design

## Goal

Elog's current `elog.config.ts` is powerful but unfriendly for new users. A user mainly wants to
choose a writing platform, a deploy target, and optional image handling. Today they must also know
which plugin packages to install, how to import each package, and which fields each plugin expects.

This design keeps `elog.config.ts` as the single runtime config format, but rebuilds `elog init`
into an interactive wizard that generates that file, installs the required plugin packages, and
creates an environment variable example file.

## Design Summary

`@elogx-test/elog` will ship a built-in official plugin registry. The registry contains only init
metadata for official plugins; it does not import or bundle plugin runtime code.

The new init flow is:

```text
built-in plugins.json
  -> choose from/to/transform plugins
  -> ask key option questions from JSON Schema metadata
  -> install selected plugin packages
  -> back up an existing config when overwriting
  -> write elog.config.ts
  -> write or merge .env and .env.example
```

`elog sync` remains unchanged. It continues to load `elog.config.ts`, and that generated config
continues to import installed plugin packages explicitly.

## Registry

Add an internal registry under `packages/elog/src/registry/`:

```text
packages/elog/src/registry/
  plugins.json
  plugin-registry.schema.json
```

`plugins.json` is versioned and published with `@elogx-test/elog`. It favors stability and offline
use over real-time updates. Future versions can add an optional `--registry <url>` or community
plugin flow, but the first version should not depend on GitHub or any remote registry.

Each registry entry should include:

```json
{
  "kind": "from",
  "type": "yuque-token",
  "displayName": "语雀",
  "packageName": "@elogx-test/plugin-from-yuque-token",
  "importName": "fromYuque",
  "optionsSchema": {
    "type": "object",
    "required": ["token", "login", "repo"],
    "properties": {
      "token": {
        "type": "string",
        "title": "语雀 Token",
        "x-elog-env": "YUQUE_TOKEN",
        "x-elog-secret": true,
        "x-elog-prompt": {
          "type": "password",
          "message": "请输入语雀 Token"
        }
      }
    },
    "additionalProperties": false
  }
}
```

The registry is not a complete plugin market. It only covers official plugin choices and the
recommended init fields. Advanced plugin options remain editable in `elog.config.ts`.

## Schema Scope

Use JSON Schema for plugin options, plus Elog-specific extension fields for init behavior.

Supported JSON Schema subset:

- `object`
- `string`
- `number`
- `boolean`
- `array`
- `enum`
- `default`
- `required`

Supported Elog extensions:

- `x-elog-env`: generate `process.env.NAME` in `elog.config.ts`, add `NAME=` to `.env.example`,
  and write the collected value to the real `.env` file.
- `x-elog-secret`: mark a value as sensitive. The wizard should use a password prompt and never
  write the literal value into `elog.config.ts` or `.env.example`.
- `x-elog-prompt`: define the prompt type and message used by the wizard.
- `x-elog-hidden`: skip prompting and use the schema default.

The first implementation should avoid supporting the entire JSON Schema language. Keeping the subset
small makes the generator and wizard easier to test.

## Init Flow

`elog init` should guide the user through a small number of product-level choices:

1. Choose a writing platform, such as Notion, Yuque, Feishu, FlowUs, or Wolai.
2. Choose one or more deploy targets, such as local filesystem, WordPress, Halo, or Confluence.
3. Choose image handling: no transform, local image download, or image hosting transform.
4. Ask the selected plugins' key option questions, including env-backed values.
5. Install the selected plugin packages.
6. Generate `elog.config.ts`, `.env`, and `.env.example`.
7. Remind the user that `.env` contains secrets and must not be committed.

If the target config file already exists, ask before overwriting:

```text
检测到已有 elog.config.ts
? 是否覆写配置文件？旧文件会自动备份 (Y/n)
```

When confirmed, back it up before writing:

```text
elog.config.ts -> elog.config.backup.20260516-153012.ts
```

If the user declines, exit without changing files.

## Environment Files

Generated config should write sensitive or environment-backed values as `process.env` references:

```ts
from: fromYuque({
  token: process.env.YUQUE_TOKEN,
  login: process.env.YUQUE_LOGIN,
  repo: process.env.YUQUE_REPO,
});
```

Generate or merge the real `.env` with values collected by the wizard:

```env
YUQUE_TOKEN=real-token
YUQUE_LOGIN=real-login
YUQUE_REPO=real-repo
```

Also generate or merge `.env.example` with empty placeholders:

```env
YUQUE_TOKEN=
YUQUE_LOGIN=
YUQUE_REPO=
```

The wizard must warn that `.env` contains secrets and should not be committed to GitHub. It should
also inspect `.gitignore`; if `.env` is not already ignored, ask whether to add it. When running with
`--force`, add `.env` to `.gitignore` automatically.

Fields with `x-elog-env` should be prompted for their actual values in the first version. The
generated config still uses `process.env.NAME`, while `.env` stores the real value and
`.env.example` stores only the empty example key.

## Command Architecture

Refactor command code into registration and execution layers:

```text
packages/elog/src/cli.ts
  create program
  register commands
  centralize top-level error handling

packages/elog/src/commands/sync/
  index.ts
  command.ts
  format.ts

packages/elog/src/commands/init/
  index.ts
  command.ts
  registry.ts
  wizard.ts
  generator.ts
  package-manager.ts
  file-writer.ts
  env.ts
  gitignore.ts
  types.ts
```

`sync` can be moved without behavior changes. It should keep `-c/--config`, `-e/--env`, and
`--debug`.

`init` should support:

```bash
elog init
elog init --name custom.config.ts
elog init --force
elog init --dry-run
```

`--force` backs up and overwrites an existing config without asking. `--dry-run` skips installation
and file writes, and prints the generated config, install command, `.env.example`, and redacted
`.env` changes.

## Package Installation

Detect the package manager in this order:

```text
packageManager field
pnpm-lock.yaml
yarn.lock
package-lock.json
bun.lockb or bun.lock
pnpm fallback
```

Install selected plugin packages into normal dependencies:

```bash
pnpm add @elogx-test/plugin-from-yuque-token @elogx-test/plugin-to-local
```

These are runtime dependencies of the generated config because `elog.config.ts` imports them.

Run package installation before writing config files. If installation fails, report the failing
command and the manual command to run. Do not write a config that imports packages that failed to
install.

## Config Generation Rules

- Generate one import per selected plugin package.
- Generate a single `from` plugin call.
- Omit `plugins` when no transform is selected.
- Generate `plugins` as an array when transforms are selected.
- Generate `to` as a single plugin call when one target is selected.
- Generate `to` as an array when multiple targets are selected.
- Use `process.env.NAME` for fields with `x-elog-env`.
- Use schema `default` when the user leaves an optional prompt blank.
- Use literal values only for non-secret fields without `x-elog-env`.

## Errors

Use explicit init error codes so tests and CLI output can stay stable:

- `REGISTRY_INVALID`: built-in registry is malformed.
- `PLUGIN_SELECTION_EMPTY`: required `from` or `to` selection is missing.
- `PACKAGE_INSTALL_FAILED`: package manager command failed.
- `CONFIG_EXISTS_ABORTED`: user declined to overwrite an existing config.
- `CONFIG_WRITE_FAILED`: config write failed.
- `ENV_WRITE_FAILED`: `.env` or `.env.example` write failed.
- `GITIGNORE_WRITE_FAILED`: `.gitignore` update failed.

Errors should be reported at the CLI boundary. Runtime/library code should not call `process.exit()`.

## Testing

Add focused tests for:

- registry parsing and validation
- schema-to-prompt conversion
- config generator output
- package manager detection
- dependency install command construction
- config backup and overwrite behavior
- `.env` and `.env.example` merge behavior
- `.gitignore` detection and update behavior
- `elog init --dry-run` smoke behavior

Run core package tests first:

```bash
pnpm --filter @elogx-test/elog test
```

Then build the core package:

```bash
pnpm --filter @elogx-test/elog build
```

For larger command architecture changes, run full workspace checks:

```bash
pnpm build
pnpm test
```

## Non-Goals

- Do not add JSON or YAML runtime config support in this phase.
- Do not dynamically load plugins during `elog sync`.
- Do not bundle official plugin runtime code into `@elogx-test/elog`.
- Do not implement a remote plugin registry in the first version.
- Do not expose every advanced plugin option in the init wizard.
- Do not write real secrets to `elog.config.ts` or `.env.example`.
