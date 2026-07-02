# Task 4 Report

Status: DONE

What changed:
- Updated the legacy 0.x diagnostic message to point at `MIGRATION.md`.
- Updated the regression test to assert the guide reference and avoid the old migrate-command wording.

Verification:
- `pnpm --filter @elogx-test/elog test -- src/config/resolve.test.ts`

Notes:
- The legacy detection still reports `LEGACY_V0_CONFIG_DETECTED` before runtime execution.
