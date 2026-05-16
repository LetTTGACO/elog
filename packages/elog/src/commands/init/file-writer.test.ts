import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { InitCommandError } from './registry';
import { createTimestamp, planGeneratedFileWrites, writeGeneratedFiles } from './file-writer';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'elog-init-files-'));
}

describe('planGeneratedFileWrites', () => {
  it('plans backup paths for existing generated files', () => {
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, 'elog.config.ts'), 'old config');
    fs.writeFileSync(path.join(cwd, '.env'), 'OLD=1');

    const plan = planGeneratedFileWrites({
      cwd,
      configName: 'elog.config.ts',
      files: {
        configText: 'new config',
        envText: 'NEW=1\n',
        envExampleText: 'NEW=\n',
      },
      timestamp: '20260516-153012',
    });

    expect(plan.map((item) => path.basename(item.targetPath))).toEqual([
      'elog.config.ts',
      '.env',
      '.env.example',
    ]);
    expect(plan[0]?.backupPath?.endsWith('elog.config.backup.20260516-153012.ts')).toBe(true);
    expect(plan[1]?.backupPath?.endsWith('.env.backup.20260516-153012')).toBe(true);
    expect(plan[2]?.backupPath).toBeUndefined();
  });

  it('uses configName for backup pattern instead of hardcoding elog.config.ts', () => {
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, 'custom.config.ts'), 'old config');

    const plan = planGeneratedFileWrites({
      cwd,
      configName: 'custom.config.ts',
      files: {
        configText: 'new config',
        envText: 'NEW=1\n',
        envExampleText: 'NEW=\n',
      },
      timestamp: '20260516-153012',
    });

    expect(plan[0]?.backupPath?.endsWith('custom.config.backup.20260516-153012.ts')).toBe(true);
  });
});

describe('createTimestamp', () => {
  it('produces YYYYMMDD-HHmmss format', () => {
    const date = new Date(2026, 4, 16, 15, 30, 12);
    expect(createTimestamp(date)).toBe('20260516-153012');
  });

  it('pads single-digit values', () => {
    const date = new Date(2025, 0, 3, 7, 8, 9);
    expect(createTimestamp(date)).toBe('20250103-070809');
  });

  it('uses current date by default', () => {
    const result = createTimestamp();
    expect(result).toMatch(/^\d{8}-\d{6}$/);
  });
});

describe('writeGeneratedFiles', () => {
  it('backs up existing files before writing new files', async () => {
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'OLD=1\n');

    await writeGeneratedFiles({
      cwd,
      configName: 'elog.config.ts',
      files: {
        configText: 'config',
        envText: 'NEW=1\n',
        envExampleText: 'NEW=\n',
      },
      timestamp: '20260516-153012',
      overwriteExisting: () => true,
    });

    expect(fs.readFileSync(path.join(cwd, '.env'), 'utf8')).toBe('NEW=1\n');
    expect(fs.readFileSync(path.join(cwd, '.env.backup.20260516-153012'), 'utf8')).toBe('OLD=1\n');
  });

  it('aborts without writing when overwrite is declined', async () => {
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, 'elog.config.ts'), 'old config');

    await expect(
      writeGeneratedFiles({
        cwd,
        configName: 'elog.config.ts',
        files: {
          configText: 'new config',
          envText: 'NEW=1\n',
          envExampleText: 'NEW=\n',
        },
        timestamp: '20260516-153012',
        overwriteExisting: () => false,
      }),
    ).rejects.toThrow('User declined to overwrite elog.config.ts.');

    expect(fs.readFileSync(path.join(cwd, 'elog.config.ts'), 'utf8')).toBe('old config');
    expect(fs.existsSync(path.join(cwd, '.env'))).toBe(false);
  });

  it('throws InitCommandError on write failure', async () => {
    const cwd = makeTempDir();
    const readOnlyDir = path.join(cwd, 'readonly');
    fs.mkdirSync(readOnlyDir);
    fs.chmodSync(readOnlyDir, 0o444);

    await expect(
      writeGeneratedFiles({
        cwd: readOnlyDir,
        configName: 'elog.config.ts',
        files: {
          configText: 'config',
          envText: 'NEW=1\n',
          envExampleText: 'NEW=\n',
        },
        timestamp: '20260516-153012',
        overwriteExisting: () => true,
      }),
    ).rejects.toThrow(InitCommandError);

    fs.chmodSync(readOnlyDir, 0o755);
  });
});
