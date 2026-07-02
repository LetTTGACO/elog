# Task 2 Report: Restore `yuque-pwd.latexCode`

## What changed

- Added `latexCode?: boolean` to `YuqueWithPwdConfig`.
- Passed `this.config.latexCode` through as `latexcode` in `YuqueApi.getDocString()`.
- Added a regression test covering the password-based Yuque markdown request.
- Added a package-level `test` script and `vitest` dev dependency for `plugin-from-yuque-pwd`.

## TDD evidence

1. Added `plugins/from/yuque-pwd/src/YuqueApi.test.ts`.
2. Ran:

   ```bash
   pnpm --filter @elogx-test/plugin-from-yuque-pwd test -- src/YuqueApi.test.ts
   ```

   The test failed as expected because `latexcode` was still `false`.
3. Updated `plugins/from/yuque-pwd/src/types.ts` and `plugins/from/yuque-pwd/src/YuqueApi.ts`.
4. Re-ran the focused test and the package build:

   ```bash
   pnpm --filter @elogx-test/plugin-from-yuque-pwd test -- src/YuqueApi.test.ts
   pnpm --filter @elogx-test/plugin-from-yuque-pwd build
   ```

   Both passed.

## Scope check

- Only the Yuque password source changed.
- Yuque token behavior was not modified.

## Notes

- `pnpm` emitted a non-blocking `prepare` warning about `.git/config` lock permissions during install work, but the test and build commands completed successfully.
