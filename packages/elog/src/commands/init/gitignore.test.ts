import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { ensureEnvIgnored, isEnvIgnored } from './gitignore';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'elog-init-gitignore-'));
}

describe('isEnvIgnored', () => {
  it('returns true when .env is already ignored', () => {
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, '.gitignore'), 'node_modules\n.env\n');

    expect(isEnvIgnored(cwd)).toBe(true);
  });

  it('returns false when .gitignore is missing', () => {
    expect(isEnvIgnored(makeTempDir())).toBe(false);
  });

  it('returns false when .gitignore exists but .env is not listed', () => {
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, '.gitignore'), 'node_modules\ndist\n');

    expect(isEnvIgnored(cwd)).toBe(false);
  });

  it('returns true when *.env pattern is listed', () => {
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, '.gitignore'), 'node_modules\n*.env\n');

    expect(isEnvIgnored(cwd)).toBe(true);
  });
});

describe('ensureEnvIgnored', () => {
  it('appends .env when accepted', async () => {
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, '.gitignore'), 'node_modules\n');

    await ensureEnvIgnored({ cwd, shouldAdd: () => true });

    expect(fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8')).toBe('node_modules\n.env\n');
  });

  it('leaves .gitignore unchanged when declined', async () => {
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, '.gitignore'), 'node_modules\n');

    await ensureEnvIgnored({ cwd, shouldAdd: () => false });

    expect(fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8')).toBe('node_modules\n');
  });

  it('creates a new .gitignore when none exists and user accepts', async () => {
    const cwd = makeTempDir();

    const result = await ensureEnvIgnored({ cwd, shouldAdd: () => true });

    expect(result).toBe(true);
    expect(fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8')).toBe('.env\n');
  });
});
