import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertPublishable, packageResult, renderSummary } from './release-report.mjs';

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
  registryBefore: { [pkg.name]: { exists: false, currentExists: true, tag: pkg.currentVersion } },
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

test('both preview and real release reject already published targets, even when the channel differs', () => {
  for (const dryRun of [true, false]) {
    const conflict = {
      ...report,
      dryRun,
      registryBefore: { [pkg.name]: { exists: true, currentExists: true, tag: '0.15.0-beta.2' } },
    };
    assert.throws(() => assertPublishable(conflict), /目标版本已存在于 npm/);
    const markdown = renderSummary({ report: conflict, steps });
    assert.match(markdown, /存在失败/);
    assert.match(markdown, /0\.15\.0-beta\.2/);
    assert.match(markdown, /❌ 已存在/);
    assert.doesNotMatch(markdown, /预演通过，计划发布/);
  }
});

test('missing historical tags block existing packages but allow a genuinely new package', () => {
  const missing = { ...report, packages: [{ ...pkg, baseline: null }] };
  assert.throws(() => assertPublishable(missing), /基线版本已发布，但缺少对应 Git tag/);
  assert.match(renderSummary({ report: missing, steps }), /已发布基线缺少 Git tag/);
  const firstRelease = {
    ...missing,
    registryBefore: { [pkg.name]: { exists: false, currentExists: false, tag: null } },
  };
  assert.doesNotThrow(() => assertPublishable(firstRelease));
  assert.match(renderSummary({ report: firstRelease, steps }), /预演通过，计划发布/);
});

test('registry errors and missing results fail closed while unchanged packages need no query', () => {
  for (const state of [undefined, { error: 'npm registry HTTP 503' }]) {
    const unknown = { ...report, registryBefore: { [pkg.name]: state } };
    assert.throws(() => assertPublishable(unknown), /npm 查询失败/);
    assert.match(renderSummary({ report: unknown, steps }), /npm 状态未确认，阻止发布/);
    assert.doesNotMatch(renderSummary({ report: unknown, steps }), /✅ 已完成/);
  }
  assert.doesNotThrow(() => assertPublishable(report));
  assert.doesNotThrow(() => assertPublishable({ packages: [{ ...pkg, newVersion: null }] }));
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

test('cancelled publication reports observed npm state instead of claiming nothing ran', () => {
  const real = { ...report, dryRun: false };
  const cancelled = { ...steps, release: { outcome: 'cancelled' } };
  const actual = { registry: { [pkg.name]: { exists: true, tag: pkg.newVersion } } };
  const markdown = renderSummary({ report: real, steps: cancelled, actual });
  assert.match(markdown, /⏹ 已取消/);
  assert.match(markdown, /取消不会撤回已上传的 npm 版本/);
  assert.match(markdown, /新版本及渠道已确认/);
  assert.doesNotMatch(markdown, /未执行发布/);
  assert.match(packageResult(pkg, real, cancelled), /npm 结果未确认/);
  actual.registry[pkg.name] = { exists: false };
  assert.match(packageResult(pkg, real, cancelled, actual), /目标版本不存在/);
});

test('recovery preserves release commits and tags as well as interrupted version file changes', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'elog-release-recovery-test-'));
  const script = fileURLToPath(new URL('./release-report.mjs', import.meta.url));
  const repo = path.join(dir, 'repo');
  const reports = path.join(dir, 'reports');
  mkdirSync(repo);
  mkdirSync(reports);
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
  try {
    git('init', '--initial-branch=v1');
    git('config', 'user.name', 'Release test');
    git('config', 'user.email', 'release@example.invalid');
    git('config', 'commit.gpgsign', 'false');
    git('config', 'core.hooksPath', '/dev/null');
    writeFileSync(path.join(repo, 'package.json'), JSON.stringify({ version: pkg.currentVersion }));
    git('add', 'package.json');
    git('commit', '-m', 'fixture release');
    git('tag', '--no-sign', '-a', `${pkg.name}@${pkg.currentVersion}`, '-m', 'fixture tag');
    const head = git('rev-parse', 'HEAD');
    const versionFile = JSON.stringify({ version: pkg.newVersion });
    writeFileSync(path.join(repo, 'package.json'), versionFile);
    writeFileSync(path.join(repo, 'CHANGELOG.md'), 'Uncommitted release notes\n');
    writeFileSync(
      path.join(reports, 'plan.json'),
      JSON.stringify({
        ...report,
        sourceSha: head,
        dryRun: false,
        packages: [{ ...pkg, root: '.' }],
      }),
    );
    const result = spawnSync(process.execPath, [script, 'recovery'], {
      cwd: repo,
      env: { ...process.env, RELEASE_REPORT_DIR: reports },
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    const saved = path.join(reports, 'recovery');
    assert.equal(JSON.parse(readFileSync(path.join(saved, 'state.json'))).head, head);
    assert.equal(readFileSync(path.join(saved, 'files/package.json'), 'utf8'), versionFile);
    assert.equal(
      readFileSync(path.join(saved, 'files/CHANGELOG.md'), 'utf8'),
      'Uncommitted release notes\n',
    );
    assert.match(
      git('bundle', 'list-heads', path.join(saved, 'release.bundle')),
      /refs\/tags\/@elog\/core@1\.0\.0-beta\.1/,
    );
    const restored = path.join(dir, 'restored');
    execFileSync('git', ['clone', path.join(saved, 'release.bundle'), restored], { stdio: 'pipe' });
    execFileSync('git', ['apply', path.join(saved, 'worktree.patch')], { cwd: restored });
    assert.equal(readFileSync(path.join(restored, 'package.json'), 'utf8'), versionFile);
    assert.equal(git('rev-parse', 'HEAD'), head);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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
