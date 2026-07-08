import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InitCommandError } from './registry';
import { buildInstallCommand, detectPackageManager, installPackages } from './package-manager';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'elog-init-pm-'));
}

describe('detectPackageManager', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses packageManager from package.json before lockfiles', () => {
    const cwd = makeTempDir();
    fs.writeFileSync(
      path.join(cwd, 'package.json'),
      JSON.stringify({ packageManager: 'yarn@4.0.0' }),
    );
    fs.writeFileSync(path.join(cwd, 'pnpm-lock.yaml'), '');

    expect(detectPackageManager(cwd)).toBe('yarn');
  });

  it('detects pnpm via pnpm-lock.yaml', () => {
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, 'pnpm-lock.yaml'), '');
    expect(detectPackageManager(cwd)).toBe('pnpm');
  });

  it('detects yarn via yarn.lock', () => {
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, 'yarn.lock'), '');
    expect(detectPackageManager(cwd)).toBe('yarn');
  });

  it('detects npm via package-lock.json', () => {
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, 'package-lock.json'), '');
    expect(detectPackageManager(cwd)).toBe('npm');
  });

  it('detects bun via bun.lockb', () => {
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, 'bun.lockb'), '');
    expect(detectPackageManager(cwd)).toBe('bun');
  });

  it('detects bun via bun.lock', () => {
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, 'bun.lock'), '');
    expect(detectPackageManager(cwd)).toBe('bun');
  });

  it('falls back to pnpm when no package manager signal exists', () => {
    const cwd = makeTempDir();
    expect(detectPackageManager(cwd)).toBe('pnpm');
  });

  it('returns undefined for malformed package.json and falls through to lockfile', () => {
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, 'package.json'), '{invalid json');
    fs.writeFileSync(path.join(cwd, 'yarn.lock'), '');

    expect(detectPackageManager(cwd)).toBe('yarn');
  });
});

describe('buildInstallCommand', () => {
  it('builds add commands for supported package managers', () => {
    expect(buildInstallCommand('pnpm', ['a', 'b'])).toEqual({
      command: 'pnpm',
      args: ['add', 'a', 'b'],
      display: 'pnpm add a b',
    });
    expect(buildInstallCommand('npm', ['a'])).toEqual({
      command: 'npm',
      args: ['install', 'a'],
      display: 'npm install a',
    });
    expect(buildInstallCommand('yarn', ['a'])).toEqual({
      command: 'yarn',
      args: ['add', 'a'],
      display: 'yarn add a',
    });
    expect(buildInstallCommand('bun', ['a'])).toEqual({
      command: 'bun',
      args: ['add', 'a'],
      display: 'bun add a',
    });
  });
});

describe('installPackages', () => {
  it('skips duplicate package names', () => {
    const spawnSync = vi.fn(() => ({ status: 0, error: undefined }));
    const result = installPackages({
      cwd: process.cwd(),
      packageManager: 'pnpm',
      packages: ['a', 'a', 'b'],
      spawnSync,
    });

    expect(result.display).toBe('pnpm add a b');
    expect(spawnSync).toHaveBeenCalledWith('pnpm', ['add', 'a', 'b'], {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
  });

  it('throws InitCommandError when spawn returns non-zero status', () => {
    const spawnSync = vi.fn(() => ({ status: 1, error: undefined }));
    expect(() =>
      installPackages({
        cwd: process.cwd(),
        packageManager: 'npm',
        packages: ['a'],
        spawnSync,
      }),
    ).toThrow(InitCommandError);
  });

  it('throws InitCommandError when spawn returns an error', () => {
    const spawnSync = vi.fn(() => ({ status: null, error: new Error('spawn failed') }));
    expect(() =>
      installPackages({
        cwd: process.cwd(),
        packageManager: 'pnpm',
        packages: ['a'],
        spawnSync,
      }),
    ).toThrow(InitCommandError);
  });
});
