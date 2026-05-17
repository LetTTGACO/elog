import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { SyncCase } from './types';

export async function loadSyncCases(repoRoot: string): Promise<SyncCase[]> {
  const casesDir = path.join(repoRoot, 'tests/e2e/cases');
  const caseDirs = fs
    .readdirSync(casesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const cases: SyncCase[] = [];

  for (const dir of caseDirs) {
    const modulePath = path.join(casesDir, dir, 'case.ts');
    const loaded = (await import(pathToFileURL(modulePath).href)) as { default: SyncCase };
    cases.push(loaded.default);
  }

  return cases;
}

export function filterSyncCases(cases: SyncCase[], selectedCase?: string): SyncCase[] {
  if (!selectedCase) {
    return cases;
  }

  const filtered = cases.filter((testCase) => testCase.id === selectedCase);

  if (filtered.length === 0) {
    throw new Error(`No e2e sync case matched ELOG_E2E_CASE=${selectedCase}`);
  }

  return filtered;
}

export function syncCaseTitle(testCase: SyncCase, missingEnv: string[] = []): string {
  if (missingEnv.length === 0) {
    return testCase.title;
  }

  return `${testCase.title} (skipped: missing ${missingEnv.join(', ')})`;
}
