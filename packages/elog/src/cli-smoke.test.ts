import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { createProgram } from './cli';
import { loadConfigFromFile } from './config/load';
import elog from './node-entry';

describe('CLI command registration', () => {
  it('registers the export command', () => {
    const program = createProgram();
    const commandNames = program.commands.map((command) => command.name());

    expect(commandNames).toContain('export');
  });
});

describe('fixture sync smoke', () => {
  it('loads fixture config and runs sync through runtime', async () => {
    const fixtureDir = path.resolve(process.cwd(), '../../tests/fixtures/basic-config');
    const cachePath = path.join(fixtureDir, 'fixture.cache.json');
    const outputPath = path.join(fixtureDir, 'fixture.output.txt');
    const previousCwd = process.cwd();

    try {
      fs.rmSync(cachePath, { force: true });
      process.chdir(fixtureDir);

      const loaded = await loadConfigFromFile(fixtureDir, 'elog.config.ts');

      expect(loaded.data).toBeTruthy();

      const results = await elog(loaded.data);

      expect(results[0]).toMatchObject({
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
