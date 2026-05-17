import { describe, expect, it } from 'vitest';
import { filterSyncCases } from './case-loader';
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
    requiredEnv: [],
    configFile: 'elog.config.ts',
    expected: {
      cacheFile: 'elog.cache.json',
      outputDir: 'docs',
      minMarkdownFiles: 1,
    },
  },
];

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

  it('throws a readable error for an unknown filter', () => {
    expect(() => filterSyncCases(cases, 'missing')).toThrow(
      'No e2e sync case matched ELOG_E2E_CASE=missing',
    );
  });
});
