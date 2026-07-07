import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDir, '../../..');

function readPackageJson(packageDir: string) {
  return JSON.parse(
    fs.readFileSync(path.join(workspaceRoot, packageDir, 'package.json'), 'utf8'),
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };
}

describe('Core package boundary', () => {
  it('depends on Plugin SDK without depending on CLI', () => {
    const core = readPackageJson('packages/core');

    expect(core.dependencies?.['@elog/plugin-sdk']).toBe('workspace:^');
    expect(core.dependencies?.['@elog/cli']).toBeUndefined();
    expect(core.devDependencies?.['@elog/cli']).toBeUndefined();
    expect(core.peerDependencies?.['@elog/cli']).toBeUndefined();
  });

  it('keeps Plugin SDK independent from Core', () => {
    const pluginSdk = readPackageJson('packages/plugin-sdk');

    expect(pluginSdk.dependencies?.['@elog/core']).toBeUndefined();
    expect(pluginSdk.devDependencies?.['@elog/core']).toBeUndefined();
    expect(pluginSdk.peerDependencies?.['@elog/core']).toBeUndefined();
  });
});
