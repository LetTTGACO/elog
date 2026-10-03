import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { filterSyncCases, loadSyncCases } from './helpers/case-loader';
import { repoRootFromE2e, runNodeScript } from './helpers/run-cli';

const require = createRequire(import.meta.url);
const vitestBin = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');

vi.stubEnv('ELOG_E2E_CASE', undefined);
vi.stubEnv('ELOG_E2E_IMAGE', undefined);
const cases = await loadSyncCases(repoRootFromE2e());
vi.unstubAllEnvs();

// Empty values also prevent dotenv from filling real credentials in the child runner.
const missingCredentials = Object.fromEntries(
  [...new Set(cases.flatMap((syncCase) => syncCase.requiredEnv))].map((name) => [name, '']),
);

function runMatrix(env: NodeJS.ProcessEnv) {
  return runNodeScript([vitestBin, 'run', '--reporter=verbose', 'src/sync-matrix.e2e.test.ts'], {
    cwd: process.cwd(),
    env: {
      ...missingCredentials,
      ELOG_E2E_STREAM_OUTPUT: '0',
      ELOG_E2E_KEEP_TMP: '0',
      ...env,
    },
  });
}

describe('sync matrix execution controls', () => {
  it('fails Stable before syncing and reports every missing profile despite manual filters', async () => {
    const result = await runMatrix({
      ELOG_E2E_STABLE: '1',
      ELOG_E2E_CASE: 'notion-catalog-to-local',
      ELOG_E2E_IMAGE: 'invalid-image-filter',
    });

    expect(result.exitCode).toBe(1);
    expect(result.combinedOutput).toContain(
      'Stable e2e requires all platform credentials before syncing',
    );
    for (const syncCase of filterSyncCases(cases, undefined, true)) {
      expect(result.combinedOutput).toContain(syncCase.title);
      for (const name of syncCase.requiredEnv) expect(result.combinedOutput).toContain(name);
    }
    expect(result.combinedOutput).not.toContain('ELOG_E2E_WORDPRESS_PASSWORD');
    expect(result.combinedOutput).not.toContain('Skipping e2e sync case');
  });

  it('keeps single-case runs skippable when credentials are missing', async () => {
    const result = await runMatrix({
      ELOG_E2E_STABLE: '0',
      ELOG_E2E_CASE: 'notion-catalog-to-local',
      ELOG_E2E_IMAGE: 'local',
    });

    expect(result.exitCode).toBe(0);
    expect(result.combinedOutput).toContain(
      'Skipping e2e sync case notion-catalog-to-local: missing required env',
    );
    expect(result.combinedOutput).toContain('1 skipped');
    expect(result.combinedOutput).not.toContain('Skipping e2e sync case yuque');
  });
});
