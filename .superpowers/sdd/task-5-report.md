# Task 5 Report

## Scope completed

- Updated `tests/e2e/package.json` with the required workspace dependencies and helper scripts.
- Added `notion-image-local-to-local` e2e case with config, metadata, and README.
- Added `yuque-token-image-local-to-local` e2e case with config, metadata, and README.
- Added `yuque-image-r2-to-local` e2e case with config, metadata, and README.
- Updated `pnpm-lock.yaml` to reflect the new `tests/e2e` workspace dependencies.

## Verification

### Red

Confirmed the new Notion case did not exist before implementation:

```bash
pnpm --filter @elogx-test/e2e exec env ELOG_E2E_CASE=notion-image-local-to-local vitest run src/sync-matrix.e2e.test.ts
```

Observed expected failure:

- `Error: No e2e sync case matched ELOG_E2E_CASE=notion-image-local-to-local`

### Green

Ran the no-credential matrix command from the brief:

```bash
pnpm --filter @elogx-test/e2e e2e -- src/sync-matrix.e2e.test.ts
```

Observed result:

- Exit code `0`
- `Test Files  5 passed | 1 skipped (6)`
- `Tests  12 passed | 4 skipped (16)`

This confirms the real-service matrix cases skip cleanly when required env vars
are absent instead of failing the suite.

## Credentialed cases

I checked for these env vars locally:

- `ELOG_E2E_NOTION_TOKEN`
- `ELOG_E2E_NOTION_DATA_SOURCE_ID`
- `ELOG_E2E_YUQUE_TOKEN`
- `ELOG_E2E_YUQUE_LOGIN`
- `ELOG_E2E_YUQUE_REPO`
- `ELOG_E2E_YUQUE_USERNAME`
- `ELOG_E2E_YUQUE_PWD`
- `ELOG_E2E_R2_HOST`
- `ELOG_E2E_R2_ACCESS_KEY_ID`
- `ELOG_E2E_R2_SECRET_ACCESS_KEY`
- `ELOG_E2E_R2_BUCKET`
- `ELOG_E2E_R2_ENDPOINT`

They were not set in this session, so I did not run the credentialed smoke
commands, per task instructions.

## Notes

- The R2 smoke case intentionally does not assert a local `images/` directory.
- Default `pnpm test` remains free of external-service requirements because these
  cases are only exercised by the dedicated e2e matrix and are skipped without
  env.
