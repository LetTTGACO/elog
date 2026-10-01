import { afterEach, describe, expect, it, vi } from 'vitest';
import { filterSyncCases, loadSyncCases, syncCaseTitle } from './case-loader';
import { repoRootFromE2e } from './run-cli';
import type { SyncCase } from './types';

const cases: SyncCase[] = [
  {
    id: 'one',
    title: 'One',
    requiredEnv: [],
    configFile: 'elog.config.ts',
    expected: {
      cacheFile: 'elog.cache.json',
      outputDir: 'docs',
      minMarkdownFiles: 1,
    },
  },
  {
    id: 'two',
    title: 'Two',
    stable: false,
    requiredEnv: [],
    configFile: 'elog.config.ts',
    expected: {
      cacheFile: 'elog.cache.json',
      outputDir: 'docs',
      minMarkdownFiles: 1,
    },
  },
];

describe('stable sync matrix', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('loads all supported sources to Halo in the stable matrix', async () => {
    vi.stubEnv('ELOG_E2E_CASE', undefined);
    vi.stubEnv('ELOG_E2E_IMAGE', undefined);
    const loaded = await loadSyncCases(repoRootFromE2e());
    const haloCases = filterSyncCases(loaded, undefined, true).filter((testCase) =>
      testCase.id.endsWith('-to-halo'),
    );

    expect(haloCases.map((testCase) => testCase.id)).toEqual([
      'feishu-space-to-halo',
      'feishu-wiki-to-halo',
      'notion-to-halo',
      'yuque-pwd-to-halo',
    ]);
    for (const testCase of haloCases) {
      expect(testCase.requiredEnv).toEqual(
        expect.arrayContaining([
          'ELOG_E2E_HALO_ENDPOINT',
          'ELOG_E2E_HALO_TOKEN',
          'ELOG_E2E_R2_HOST',
          'ELOG_E2E_R2_ACCESS_KEY_ID',
        ]),
      );
      expect(testCase.assert).toBeTypeOf('function');
    }
  });

  it('loads all automatic image profiles for the stable Yuque password case', async () => {
    vi.stubEnv('ELOG_E2E_CASE', undefined);
    vi.stubEnv('ELOG_E2E_IMAGE', undefined);
    const loaded = await loadSyncCases(repoRootFromE2e());
    const imageCases = filterSyncCases(loaded, 'yuque-pwd-to-local', true);

    expect(imageCases.map((testCase) => testCase.env?.ELOG_E2E_IMAGE)).toEqual([
      'local',
      'cos',
      'github',
      'oss',
      'qiniu',
      'r2',
      'upyun',
    ]);
    expect(imageCases.every((testCase) => testCase.assert)).toBe(true);
  });

  it('selects only the requested image profile for a manual run', async () => {
    vi.stubEnv('ELOG_E2E_CASE', 'yuque-pwd-to-local');
    vi.stubEnv('ELOG_E2E_IMAGE', 'cos');
    const loaded = await loadSyncCases(repoRootFromE2e());
    const imageCases = filterSyncCases(loaded, 'yuque-pwd-to-local', true);

    expect(imageCases).toHaveLength(1);
    expect(imageCases[0]).toMatchObject({ env: { ELOG_E2E_IMAGE: 'cos' } });
    expect(imageCases[0]!.requiredEnv).toContain('ELOG_E2E_COS_SECRET_ID');
    expect(imageCases[0]!.requiredEnv).not.toContain('ELOG_E2E_R2_ACCESS_KEY_ID');
  });
});

describe('filterSyncCases', () => {
  it('returns all cases when no filter is provided', () => {
    expect(filterSyncCases(cases, undefined).map((testCase) => testCase.id)).toEqual([
      'one',
      'two',
    ]);
  });

  it('returns only the matching case when a filter is provided', () => {
    expect(filterSyncCases(cases, 'two').map((testCase) => testCase.id)).toEqual(['two']);
  });

  it('returns only stable cases when stable mode is enabled', () => {
    expect(filterSyncCases(cases, undefined, true).map((testCase) => testCase.id)).toEqual(['one']);
  });

  it('does not match optional manual cases in stable mode', () => {
    expect(() => filterSyncCases(cases, 'two', true)).toThrow(
      'No stable e2e sync case matched ELOG_E2E_CASE=two',
    );
  });

  it('throws a readable error for an unknown filter', () => {
    expect(() => filterSyncCases(cases, 'missing')).toThrow(
      'No e2e sync case matched ELOG_E2E_CASE=missing',
    );
  });
});

describe('syncCaseTitle', () => {
  it('includes missing required env names in skipped case titles', () => {
    expect(syncCaseTitle(cases[0]!, ['ELOG_E2E_TOKEN', 'ELOG_E2E_REPO'])).toBe(
      'One (skipped: missing ELOG_E2E_TOKEN, ELOG_E2E_REPO)',
    );
  });
});
