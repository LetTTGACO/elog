import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ensureEnvIgnored } from './gitignore';

let cwd: string;
function git(...args: string[]) {
  return execFileSync('git', ['-c', 'core.excludesFile=/dev/null', ...args], {
    cwd,
    encoding: 'utf8',
  });
}
beforeEach(() => {
  cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-ignore-'));
});
afterEach(() => fs.rmSync(cwd, { recursive: true, force: true }));

describe('env ignore protection', () => {
  it('creates a gitignore outside a repository and is idempotent', () => {
    expect(ensureEnvIgnored(cwd).status).toBe('created');
    expect(fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8')).toBe('/.env\n');
    expect(ensureEnvIgnored(cwd).status).toBe('ignored');
  });

  it('appends a scoped rule while preserving content and CRLF', () => {
    git('init', '-q');
    fs.writeFileSync(path.join(cwd, '.gitignore'), '# Existing rules\r\nnode_modules');
    expect(ensureEnvIgnored(cwd).status).toBe('updated');
    expect(fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8')).toBe(
      '# Existing rules\r\nnode_modules\r\n/.env\r\n',
    );
    expect(git('check-ignore', '.env').trim()).toBe('.env');
  });

  it('respects effective rules from the parent directory', () => {
    git('init', '-q');
    fs.writeFileSync(path.join(cwd, '.gitignore'), '.env\n');
    const nested = path.join(cwd, 'app');
    fs.mkdirSync(nested);
    expect(ensureEnvIgnored(nested).status).toBe('ignored');
    expect(fs.existsSync(path.join(nested, '.gitignore'))).toBe(false);
  });

  it.each([true, false])('preserves explicit negation with repository=%s', (repository) => {
    if (repository) git('init', '-q');
    const original = '.env\n!.env\n';
    fs.writeFileSync(path.join(cwd, '.gitignore'), original);
    expect(ensureEnvIgnored(cwd).status).toBe('unignored');
    expect(fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8')).toBe(original);
  });

  it('reports a tracked env without changing ignore rules or the index', () => {
    git('init', '-q');
    fs.writeFileSync(path.join(cwd, '.env'), 'TOKEN=\n');
    git('add', '.env');
    fs.writeFileSync(path.join(cwd, '.gitignore'), '/.env\n');
    expect(ensureEnvIgnored(cwd).status).toBe('tracked');
    expect(git('ls-files', '--', '.env').trim()).toBe('.env');
    expect(fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8')).toBe('/.env\n');
  });

  it('preserves explicit negation inherited from a parent directory', () => {
    git('init', '-q');
    fs.writeFileSync(path.join(cwd, '.gitignore'), '*.env\n!app/.env\n');
    const nested = path.join(cwd, 'app');
    fs.mkdirSync(nested);
    expect(ensureEnvIgnored(nested).status).toBe('unignored');
    expect(fs.existsSync(path.join(nested, '.gitignore'))).toBe(false);
  });

  it('reports an unwritable gitignore without changing its content', () => {
    const target = path.join(cwd, '.gitignore');
    fs.writeFileSync(target, '# Keep this\n');
    fs.chmodSync(target, 0o444);
    try {
      expect(() => ensureEnvIgnored(cwd)).toThrowError(
        expect.objectContaining({ code: 'GITIGNORE_WRITE_FAILED' }),
      );
      expect(fs.readFileSync(target, 'utf8')).toBe('# Keep this\n');
    } finally {
      fs.chmodSync(target, 0o644);
    }
  });

  it('reports an invalid gitignore instead of claiming protection', () => {
    fs.mkdirSync(path.join(cwd, '.gitignore'));
    expect(() => ensureEnvIgnored(cwd)).toThrow();
  });
});
