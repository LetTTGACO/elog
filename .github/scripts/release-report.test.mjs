import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { packageResult, renderSummary } from './release-report.mjs';

const pkg = {
  name: '@elog/core',
  currentVersion: '1.0.0-beta.1',
  newVersion: '1.0.0-beta.2',
  reason: '预发布版本递增（Nx）',
  baseline: '@elog/core@1.0.0-beta.1',
  dependencies: {},
  commits: [{ sha: 'a'.repeat(40), subject: 'fix: escape | <details> [link](url)' }],
};
const report = {
  dryRun: true,
  channel: 'beta',
  sourceSha: 'b'.repeat(40),
  repository: 'LetTTGACO/elog',
  packages: [pkg],
  changelogs: { '@elog/core': '### Fixes\n\n- Isolate deploy documents' },
};
const steps = Object.fromEntries(
  ['install', 'build', 'typecheck', 'report_test', 'test', 'prepare', 'plan', 'release'].map(
    (id) => [id, { outcome: 'success' }],
  ),
);

test('preview shows package versions, commit links and aggregated test outcomes without claiming publication', () => {
  const markdown = renderSummary({
    report,
    steps,
    tests: [
      {
        name: '@elog/core',
        files: 2,
        counts: { passed: 5, failed: 0, skipped: 1, pending: 0 },
        failures: [],
      },
    ],
  });
  assert.match(markdown, /Beta 发布预演/);
  assert.match(markdown, /1\.0\.0-beta\.1.*1\.0\.0-beta\.2/);
  assert.match(markdown, /5 通过 · 0 失败 · 1 跳过/);
  assert.match(markdown, /CLI E2E \| — 未执行/);
  assert.match(markdown, /预演通过，计划发布/);
  assert.match(markdown, /compare\/%40elog%2Fcore%401\.0\.0-beta\.1/);
  assert.match(markdown, /&#124; &lt;details&gt; \\\[link/);
  assert.match(markdown, /Isolate deploy documents/);
  assert.doesNotMatch(markdown, /新版本及渠道已确认/);
});

test('a failed build still produces a useful report without package or test data', () => {
  const markdown = renderSummary({
    channel: 'latest',
    dryRun: true,
    steps: { build: { outcome: 'failure' }, test: { outcome: 'skipped' } },
  });
  assert.match(markdown, /稳定版发布预演/);
  assert.match(markdown, /失败步骤：build/);
  assert.match(markdown, /尚无可用版本计划/);
  assert.match(markdown, /单元／集成测试 \| — 未执行/);
  assert.doesNotMatch(markdown, /0 通过/);
});

test('partial publishing distinguishes existing, new, missing and unverified versions', () => {
  const real = { ...report, dryRun: false, registryBefore: { [pkg.name]: { exists: false } } };
  const failed = { release: { outcome: 'failure' } };
  const actual = { registry: { [pkg.name]: { exists: true, tag: pkg.newVersion } } };
  assert.match(packageResult(pkg, real, failed, actual), /新版本及渠道已确认/);
  real.registryBefore[pkg.name].exists = true;
  assert.match(packageResult(pkg, real, failed, actual), /原已存在/);
  actual.registry[pkg.name].tag = '1.0.0-beta.1';
  assert.match(packageResult(pkg, real, failed, actual), /beta 指向/);
  actual.registry[pkg.name] = { exists: false };
  assert.match(packageResult(pkg, real, failed, actual), /目标版本不存在/);
  actual.registry[pkg.name] = { error: 'network unavailable' };
  assert.match(packageResult(pkg, real, failed, actual), /结果未确认/);
  assert.equal(packageResult(pkg, real, { release: { outcome: 'skipped' } }), '未执行发布');
});

test('successful npm publication cannot hide a failed Git push', () => {
  const real = { ...report, dryRun: false, registryBefore: { [pkg.name]: { exists: false } } };
  const markdown = renderSummary({
    report: real,
    steps: { ...steps, push: { outcome: 'failure' }, verify: { outcome: 'failure' } },
    actual: {
      registry: { [pkg.name]: { exists: true, tag: pkg.newVersion } },
      git: { commit: 'c'.repeat(40), remoteContainsCommit: false },
    },
  });
  assert.match(markdown, /Beta 发布结果/);
  assert.match(markdown, /存在失败/);
  assert.match(markdown, /新版本及渠道已确认/);
  assert.match(markdown, /Git 推送步骤：❌ 失败/);
  assert.match(markdown, /Git 远端提交或标签尚未全部确认/);
});

test('command failure preserves its exit code and logs, and summary runs after it', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'elog-release-report-test-'));
  const script = fileURLToPath(new URL('./release-report.mjs', import.meta.url));
  const env = {
    ...process.env,
    RELEASE_REPORT_DIR: dir,
    RELEASE_CHANNEL: 'beta',
    RELEASE_DRY_RUN: 'true',
    GITHUB_STEP_SUMMARY: path.join(dir, 'github.md'),
    RELEASE_STEPS: JSON.stringify({ build: { outcome: 'failure' } }),
  };
  try {
    const failed = spawnSync(
      process.execPath,
      [
        script,
        'run',
        'build',
        process.execPath,
        '-e',
        'console.error("fixture build failure"); process.exit(7)',
      ],
      { env },
    );
    assert.equal(failed.status, 7);
    assert.match(readFileSync(path.join(dir, 'build.log'), 'utf8'), /fixture build failure/);
    assert.equal(
      JSON.parse(readFileSync(path.join(dir, 'build.step.json'), 'utf8')).outcome,
      'failure',
    );
    const summary = spawnSync(process.execPath, [script, 'summary'], { env });
    assert.equal(summary.status, 0, summary.stderr.toString());
    assert.match(readFileSync(env.GITHUB_STEP_SUMMARY, 'utf8'), /失败步骤：build/);
    assert.equal(
      readFileSync(env.GITHUB_STEP_SUMMARY, 'utf8'),
      readFileSync(path.join(dir, 'summary.md'), 'utf8'),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
