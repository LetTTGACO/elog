import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';
import { expectExitCode } from '../src/helpers/assertions';
import { runElog } from '../src/helpers/run-cli';
import type { CommandCase } from '../src/helpers/types';

const commandCase: CommandCase = {
  id: 'version',
  command: ['--version'],
  async expect({ result, repoRoot, workspace }) {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'packages/cli/package.json'), 'utf8'),
    ) as { version: string };

    expectExitCode(result, 0);
    expect(result.stdout.trim()).toBe(packageJson.version);

    const cliDir = path.join(repoRoot, 'packages/cli');
    const copiedCliDir = path.join(workspace, 'packages/cli');
    fs.mkdirSync(copiedCliDir, { recursive: true });
    for (const entry of ['bin', 'dist', 'package.json']) {
      fs.cpSync(path.join(cliDir, entry), path.join(copiedCliDir, entry), { recursive: true });
    }
    fs.symlinkSync(
      path.join(cliDir, 'node_modules'),
      path.join(copiedCliDir, 'node_modules'),
      'junction',
    );

    // 模拟发布先构建再升版本，验证已构建的 CLI 读取安装包的最终版本。
    const releaseVersion = '99.0.0-runtime-test';
    fs.writeFileSync(
      path.join(copiedCliDir, 'package.json'),
      JSON.stringify({ ...packageJson, version: releaseVersion }),
    );
    const options = { cwd: workspace, repoRoot: workspace };
    const versionResult = await runElog(['--version'], options);
    expectExitCode(versionResult, 0);
    expect(versionResult.stdout.trim()).toBe(releaseVersion);

    const initResult = await runElog(['init', '--dry-run'], options);
    expectExitCode(initResult, 0);
    expect(initResult.stdout).toContain(`@elog/cli@${releaseVersion}`);
  },
};

export default commandCase;
