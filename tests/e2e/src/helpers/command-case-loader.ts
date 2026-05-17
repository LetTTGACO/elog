import fs from 'node:fs';
import path from 'node:path';
import type { CommandCase } from './types';

export async function loadCommandCases(repoRoot: string): Promise<CommandCase[]> {
  const casesDir = path.join(repoRoot, 'tests/e2e/command-cases');
  const caseFiles = fs
    .readdirSync(casesDir)
    .filter((file) => file.endsWith('.case.ts'))
    .sort();

  const cases: CommandCase[] = [];

  for (const file of caseFiles) {
    const modulePath = path.join(casesDir, file);
    const loaded = (await import(pathToFileUrl(modulePath))) as { default: CommandCase };
    cases.push(loaded.default);
  }

  return cases;
}

function pathToFileUrl(filePath: string): string {
  return new URL(`file://${filePath}`).href;
}
