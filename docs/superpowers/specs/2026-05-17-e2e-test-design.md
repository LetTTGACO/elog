# E2E Test Design

Date: 2026-05-17

## Goal

Add manually triggered end-to-end tests for the Elog 1.0 monorepo. The first
version should verify two user-facing surfaces:

- Real `elog` command execution through the packaged CLI entry.
- Real `elog sync` flow from Yuque to local image replacement and local file
  deployment.

The tests must be structured so new commands, source plugins, transform plugins,
and target plugins can be added by registering new cases instead of rewriting the
runner.

## Non-Goals

- Do not add these tests to the default `pnpm test` path.
- Do not require CI secrets in the first version.
- Do not test remote target deploy plugins such as Halo or WordPress yet.
- Do not migrate the existing `tests/test-elog` manual playground.

## Recommended Approach

Create a dedicated `tests/e2e` workspace with Vitest-based tests that spawn the
real CLI process. Expose root-level manual scripts for command e2e and sync e2e.

This combines two properties:

- The tests use structured assertions and isolated temporary workspaces.
- The tests remain opt-in and avoid slowing or destabilizing normal unit tests.

## Workspace Layout

```text
tests/e2e/
  package.json
  vitest.config.ts
  command-cases/
    version.case.ts
    init-dry-run.case.ts
    sync-missing-config.case.ts
    sync-offline-fixture.case.ts
  cases/
    yuque-image-local-to-local/
      case.ts
      elog.config.ts
      README.md
  src/
    cli-command.e2e.test.ts
    sync-matrix.e2e.test.ts
    helpers/
      assertions.ts
      case-loader.ts
      command-case-loader.ts
      run-cli.ts
      temp-workspace.ts
```

`tests/e2e/package.json` should depend on workspace packages used by the cases:

- `@elogx-test/elog`
- `@elogx-test/plugin-from-yuque-token`
- `@elogx-test/plugin-image-local`
- `@elogx-test/plugin-to-local`
- `vitest`

Use Node's built-in `child_process.spawn` for the CLI runner instead of adding an
extra process library dependency.

## Manual Commands

Add root scripts that are explicit and opt-in:

```json
{
  "scripts": {
    "e2e": "pnpm --filter @elogx-test/e2e test",
    "e2e:cli": "pnpm --filter @elogx-test/e2e test:cli",
    "e2e:yuque-local": "pnpm --filter @elogx-test/e2e test:yuque-local"
  }
}
```

The e2e package should expose matching scripts:

- `test`: build once, then run command e2e and enabled sync cases.
- `test:cli`: build once, then run command e2e only.
- `test:yuque-local`: build once, then run only the
  `yuque-image-local-to-local` sync case.

The first implementation should build inside the e2e package scripts so the real
`packages/elog/bin/elog.js` entry uses fresh `dist` output. The build step should
call the root monorepo build command from the repository root.

## Command E2E Design

`cli-command.e2e.test.ts` should not hard-code every command. It should load
case files from `tests/e2e/command-cases/*.case.ts`.

Each command case declares:

- `id`: stable case identifier.
- `command`: CLI arguments after `elog`.
- Optional `env`.
- Optional `setup({ workspace })`.
- `expect({ result, workspace })`.

Example shape:

```ts
export default {
  id: 'init-dry-run',
  command: ['init', '--dry-run', '--name', 'elog.config.ts'],
  async expect({ result }) {
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('elog.config.ts');
  },
};
```

First command cases:

- `version.case.ts`: runs `elog --version` and expects the current package
  version.
- `init-dry-run.case.ts`: runs `elog init --dry-run --name elog.config.ts` and
  expects a successful dry-run without writing project files.
- `sync-missing-config.case.ts`: runs `elog sync --config missing.config.ts` and
  expects a non-zero exit code with a readable error.
- `sync-offline-fixture.case.ts`: runs `elog sync` against an offline fixture and
  expects successful output, cache creation, and a generated local artifact.

This registry design lets future commands such as `doctor`, `config validate`,
`plugin list`, or `cache clean` add coverage by adding a case file only.

## Sync Matrix Design

`sync-matrix.e2e.test.ts` should load sync cases from `tests/e2e/cases/*/case.ts`.
Each case owns its plugin combination and platform-specific requirements.

Each sync case declares:

- `id`: stable case identifier.
- `title`: readable test title.
- `requiredEnv`: environment variables needed to run.
- `configFile`: config filename copied into the temporary workspace.
- `expected`: generic expectations such as output directory, image directory,
  cache file, minimum markdown count, and minimum image count.
- Optional custom assertion hook for plugin-specific checks.

The first real sync case is `yuque-image-local-to-local`.

```text
real elog CLI
  -> load elog.config.ts from a temporary workspace
  -> plugin-from-yuque-token downloads documents from Yuque
  -> plugin-image-local downloads referenced images into images/
  -> plugin-to-local writes markdown into docs/
  -> cache is written to elog.cache.json
```

The case config maps e2e-specific environment variables into plugin options:

```ts
fromYuque({
  token: process.env.ELOG_E2E_YUQUE_TOKEN,
  login: process.env.ELOG_E2E_YUQUE_LOGIN,
  repo: process.env.ELOG_E2E_YUQUE_REPO,
  onlyPublic: false,
})
```

Use e2e-specific names to avoid colliding with the existing manual playground:

```bash
ELOG_E2E_YUQUE_TOKEN=
ELOG_E2E_YUQUE_LOGIN=
ELOG_E2E_YUQUE_REPO=
ELOG_E2E_KEEP_TMP=1
```

If required env is missing, the case should be skipped, not failed.

Case selection should be explicit. The matrix runner should support an
`ELOG_E2E_CASE` filter. `test:yuque-local` should set
`ELOG_E2E_CASE=yuque-image-local-to-local`. The generic `test` script may run all
loaded sync cases, but each real-platform case still skips itself when required
credentials are missing.

## Sync Assertions

The Yuque local sync case should run twice in the same temporary workspace.

First run:

- Exit code is `0`.
- Output contains the sync result label.
- `docs/` exists.
- At least one markdown file exists.
- `images/` exists.
- At least one image file exists when the case marks images as expected.
- `elog.cache.json` exists and parses as JSON.
- Cache contains a `sortedDocList`.

Second run:

- Exit code is `0`.
- Output reports a skipped or no-change workflow.
- Existing docs and cache remain valid.

This covers full sync and the incremental no-change path.

## Temporary Workspace Behavior

Each test case gets its own temporary workspace. The runner copies only the files
declared by the case into that directory and runs the real CLI with the temporary
workspace as `cwd`.

By default, temporary workspaces are removed after successful tests. When a case
fails, or when `ELOG_E2E_KEEP_TMP=1` is set, the runner should print the
workspace path and preserve it for inspection.

## Stability Rules

- Real platform e2e remains manual in the first version.
- The Yuque test repository must contain at least one stable published document.
- Image assertions require the Yuque test repository to contain at least one
  stable, downloadable image.
- Network failures, token failures, and upstream API changes should fail the
  manually triggered case because the point is to verify the real integration.
- Missing local credentials should skip the case with a clear message.

## Future Plugin Expansion

New source, transform, and target plugin combinations should be added as new sync
case directories:

```text
cases/
  notion-image-local-to-local/
  feishu-image-local-to-local/
  yuque-image-qiniu-to-local/
  yuque-image-local-to-halo/
```

The shared runner should stay generic. Plugin-specific behavior belongs in each
case's config and custom assertions.

Remote target plugins such as Halo, WordPress, or Confluence should add a cleanup
strategy before they are enabled. Those cases should use unique test prefixes or
dedicated test spaces so repeated runs do not pollute real content.

## Implementation Boundary

The first implementation should include:

- New `tests/e2e` workspace.
- Command case loader and command e2e runner.
- Sync case loader and sync matrix runner.
- Real CLI process helper.
- Temporary workspace helper.
- Initial command cases for version, init dry-run, missing sync config, and
  offline sync.
- Initial sync case for Yuque token source, local image transform, and local
  deploy.
- Root manual scripts.

The first implementation should not include CI workflow changes.
