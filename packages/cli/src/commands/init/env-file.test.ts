import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { planEnvFile, writeEnvFile } from './env-file';
import { collectEnvValues } from './generator';
import { loadBuiltInPluginRegistry } from './registry';

const guideComment =
  '# 以下变量需前往对应平台获取或配置，请参考教程后填写。\n' +
  '# 获取与配置教程：https://elog.1874.cool/notion/gvnxobqogetukays\n\n';

let cwd: string;
beforeEach(() => {
  cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-env-'));
});
afterEach(() => fs.rmSync(cwd, { recursive: true, force: true }));

describe('env file merging', () => {
  it.each(['', '\n'])(
    'appends the COS prefix after existing empty variables and stays idempotent with suffix %j',
    (suffix) => {
      const original =
        [
          'YUQUE_TOKEN=',
          'YUQUE_LOGIN=',
          'YUQUE_REPO=',
          'COS_SECRET_ID=',
          'COS_SECRET_KEY=',
          'COS_BUCKET=',
          'COS_REGION=',
          'COS_HOST=',
        ].join('\n') + suffix;
      fs.writeFileSync(path.join(cwd, '.env'), original);
      const { plugins } = loadBuiltInPluginRegistry();
      const variables = collectEnvValues({
        from: plugins.find((plugin) => plugin.type === 'yuque-token')!,
        transforms: [plugins.find((plugin) => plugin.type === 'image-cos')!],
        to: [plugins.find((plugin) => plugin.kind === 'to' && plugin.type === 'local')!],
      });
      expect(writeEnvFile(cwd, variables).added).toEqual(['COS_PREFIX_KEY']);
      const expected =
        original + (suffix ? '' : '\n') + guideComment + '# COS 路径前缀\nCOS_PREFIX_KEY=\n';
      expect(fs.readFileSync(path.join(cwd, '.env'), 'utf8')).toBe(expected);
      expect(writeEnvFile(cwd, variables).added).toEqual([]);
      expect(fs.readFileSync(path.join(cwd, '.env'), 'utf8')).toBe(expected);
    },
  );

  it.each([undefined, '#\nCOS_PREFIX_KEY=\n'])(
    'generates the COS prefix description for a new variable while preserving existing content: %j',
    (existing) => {
      const { plugins } = loadBuiltInPluginRegistry();
      const variables = collectEnvValues({
        from: plugins.find((plugin) => plugin.type === 'notion')!,
        transforms: [plugins.find((plugin) => plugin.type === 'image-cos')!],
        to: [plugins.find((plugin) => plugin.kind === 'to' && plugin.type === 'local')!],
      }).filter((variable) => variable.name === 'COS_PREFIX_KEY');
      expect(variables[0]?.description).toBe('COS 路径前缀');
      if (existing !== undefined) fs.writeFileSync(path.join(cwd, '.env'), existing);
      const result = writeEnvFile(cwd, variables);
      expect(result.added).toEqual(existing === undefined ? ['COS_PREFIX_KEY'] : []);
      expect(fs.readFileSync(path.join(cwd, '.env'), 'utf8')).toBe(
        existing ?? guideComment + '# COS 路径前缀\nCOS_PREFIX_KEY=\n',
      );
    },
  );

  it('creates deduplicated empty placeholders without prompting', () => {
    expect(
      writeEnvFile(
        cwd,
        ['TOKEN', 'ENDPOINT', 'TOKEN'].map((name) => ({ name })),
      ).added,
    ).toEqual(['TOKEN', 'ENDPOINT']);
    expect(fs.readFileSync(path.join(cwd, '.env'), 'utf8')).toBe(
      guideComment + 'TOKEN=\nENDPOINT=\n',
    );
  });

  it('preserves values, empty assignments, comments, multiline values and line endings', () => {
    const original =
      '# Existing settings\r\nexport TOKEN="keep-me"\r\nEMPTY=\r\nTEXT="first\r\nNEW=inside-value\r\nlast"';
    fs.writeFileSync(path.join(cwd, '.env'), original);
    const result = writeEnvFile(
      cwd,
      ['TOKEN', 'EMPTY', 'NEW'].map((name) => ({
        name,
        description: '说明：' + name + '\n下一行',
      })),
    );
    expect(result.added).toEqual(['NEW']);
    expect(fs.readFileSync(path.join(cwd, '.env'), 'utf8')).toBe(
      `${original}\r\n${guideComment.replace(/\n/g, '\r\n')}# 说明：NEW\r\n# 下一行\r\nNEW=\r\n`,
    );
    const before = fs.statSync(path.join(cwd, '.env')).mtimeMs;
    expect(
      writeEnvFile(
        cwd,
        ['TOKEN', 'EMPTY', 'NEW'].map((name) => ({
          name,
          description: '说明：' + name + '\n下一行',
        })),
      ).added,
    ).toEqual([]);
    expect(fs.statSync(path.join(cwd, '.env')).mtimeMs).toBe(before);
  });

  it('plans additions without writing or exposing existing values', () => {
    fs.writeFileSync(path.join(cwd, '.env'), 'TOKEN=keep-me\n');
    const plan = planEnvFile(
      cwd,
      ['TOKEN', 'NEW'].map((name) => ({ name })),
    );
    expect(plan.added).toEqual(['NEW']);
    expect(JSON.stringify(plan)).not.toContain('keep-me');
    expect(fs.readFileSync(path.join(cwd, '.env'), 'utf8')).toBe('TOKEN=keep-me\n');
  });

  it('does not create an env file when no variables are needed', () => {
    expect(writeEnvFile(cwd, []).added).toEqual([]);
    expect(fs.existsSync(path.join(cwd, '.env'))).toBe(false);
  });
});
