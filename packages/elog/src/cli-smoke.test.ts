import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import type { WorkflowResult } from '@elog/core';
import { createProgram } from './cli';
import { runSyncCommand } from './commands/sync';

describe('CLI command registration', () => {
  it('registers the export command', () => {
    const program = createProgram();
    const commandNames = program.commands.map((command) => command.name());

    expect(commandNames).toContain('export');
  });
});

describe('fixture sync smoke', () => {
  it('runs fixture config through the sync command adapter', async () => {
    const fixtureDir = path.resolve(process.cwd(), '../../tests/fixtures/basic-config');
    const cachePath = path.join(fixtureDir, 'fixture.cache.json');
    const outputPath = path.join(fixtureDir, 'fixture.output.txt');
    const previousCwd = process.cwd();
    let results: WorkflowResult[] | undefined;

    try {
      fs.rmSync(cachePath, { force: true });
      process.chdir(fixtureDir);

      await runSyncCommand('elog.config.ts', undefined, false, {
        log: () => {},
        reportResults: (value) => {
          results = value;
        },
      });

      expect(results).toBeDefined();
      expect(results![0]).toMatchObject({
        status: 'success',
        workflowId: 'fixture',
        syncedCount: 1,
      });
      expect(fs.readFileSync(outputPath, 'utf8')).toBe('fixture-transformed');
    } finally {
      process.chdir(previousCwd);
      fs.rmSync(cachePath, { force: true });
      fs.rmSync(outputPath, { force: true });
    }
  });
});
