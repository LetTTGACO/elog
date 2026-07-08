import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import type { WorkflowResult } from '@elog/core';
import { createProgram } from './cli';
import { runSyncCommand } from './commands/sync';

function linkFixtureDependency(
  fixtureDir: string,
  packageName: '@elog/core' | '@elog/plugin-sdk',
  packageDir: string,
): string {
  const scopeDir = path.join(fixtureDir, 'node_modules', '@elog');
  const linkPath = path.join(scopeDir, packageName.replace('@elog/', ''));
  fs.mkdirSync(scopeDir, { recursive: true });

  if (fs.existsSync(linkPath)) {
    const stats = fs.lstatSync(linkPath);
    if (!stats.isSymbolicLink()) {
      throw new Error(`Fixture dependency path is not a symlink: ${linkPath}`);
    }
    fs.rmSync(linkPath, { force: true });
  }

  fs.symlinkSync(packageDir, linkPath, 'junction');
  return linkPath;
}

function cleanupFixtureDependencyLinks(links: string[], fixtureDir: string): void {
  for (const link of links) {
    fs.rmSync(link, { force: true });
  }

  for (const dir of [
    path.join(fixtureDir, 'node_modules', '@elog'),
    path.join(fixtureDir, 'node_modules'),
  ]) {
    try {
      fs.rmdirSync(dir);
    } catch {
      // The directory may contain other local test dependencies.
    }
  }
}

describe('CLI command registration', () => {
  it('registers the export command', () => {
    const program = createProgram();
    const commandNames = program.commands.map((command) => command.name());

    expect(commandNames).toContain('export');
  });
});

describe('fixture sync smoke', () => {
  it('runs fixture config through the sync command adapter', async () => {
    const repoRoot = path.resolve(process.cwd(), '../..');
    const fixtureDir = path.resolve(process.cwd(), '../../tests/fixtures/basic-config');
    const cachePath = path.join(fixtureDir, 'fixture.cache.json');
    const outputPath = path.join(fixtureDir, 'fixture.output.txt');
    const previousCwd = process.cwd();
    const dependencyLinks: string[] = [];
    let results: WorkflowResult[] | undefined;

    try {
      dependencyLinks.push(
        linkFixtureDependency(fixtureDir, '@elog/core', path.join(repoRoot, 'packages/core')),
        linkFixtureDependency(
          fixtureDir,
          '@elog/plugin-sdk',
          path.join(repoRoot, 'packages/plugin-sdk'),
        ),
      );
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
      cleanupFixtureDependencyLinks(dependencyLinks, fixtureDir);
    }
  });
});
