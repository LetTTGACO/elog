import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  assertPublishable,
  packageResult,
  renderSummary,
  verifyRegistry,
} from './release-report.mjs';

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
  [
    'install',
    'build',
    'typecheck',
    'report_test',
    'test',
    'offline_test',
    'prepare',
    'plan',
    'release',
  ].map((id) => [id, { outcome: 'success' }]),
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
  assert.match(markdown, /离线 E2E \| ✅ 通过/);
  assert.match(markdown, /预演通过，计划发布/);
  assert.match(markdown, /compare\/%40elog%2Fcore%401\.0\.0-beta\.1/);
  assert.match(markdown, /&#124; &lt;details&gt; \\\[link/);
  assert.match(markdown, /Isolate deploy documents/);
  assert.doesNotMatch(markdown, /新版本及渠道已确认/);
});

test('offline E2E is required for completion in previews and real releases', () => {
  for (const dryRun of [true, false]) {
    const complete = {
      ...steps,
      push: { outcome: 'success' },
      verify: { outcome: 'success' },
    };
    const input = {
      report: { ...report, dryRun },
      steps: complete,
      metrics: { offline_test: { durationMs: 12500 } },
    };
    assert.match(renderSummary(input), /✅ 已完成/);
    assert.match(renderSummary(input), /离线 E2E \| ✅ 通过 \| 12\.5s/);

    for (const outcome of ['failure', 'skipped', undefined]) {
      const verificationSteps = { ...complete };
      if (outcome) verificationSteps.offline_test = { outcome };
      else delete verificationSteps.offline_test;
      const markdown = renderSummary({
        ...input,
        steps: verificationSteps,
      });
      assert.doesNotMatch(markdown, /✅ 已完成/);
      assert.match(
        markdown,
        outcome === 'failure' ? /离线 E2E \| ❌ 失败/ : /离线 E2E \| — 未执行/,
      );
    }
  }
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

test('publication verification waits ten seconds and retries only packages not yet confirmed', async () => {
  const packages = [pkg, { ...pkg, name: '@elog/plugin-sdk' }, { ...pkg, name: '@elog/cli' }];
  let clock = 0;
  const waits = [];
  const queries = [];
  const snapshots = [];
  const result = await verifyRegistry(packages, 'beta', {
    now: () => clock,
    sleep: async (ms) => {
      waits.push(ms);
      clock += ms;
    },
    query: async (pending, channel) => {
      assert.equal(channel, 'beta');
      queries.push({ time: clock, names: pending.map((p) => p.name) });
      return Object.fromEntries(
        pending.map((p) => [
          p.name,
          queries.length === 1 && p.name === '@elog/core'
            ? { exists: false, tag: p.currentVersion }
            : queries.length <= 2 && p.name === '@elog/plugin-sdk'
              ? { exists: true, tag: p.currentVersion }
              : { exists: true, tag: p.newVersion, integrity: 'fixture-integrity' },
        ]),
      );
    },
    onAttempt: (snapshot) => snapshots.push(snapshot),
  });
  assert.deepEqual(waits, [10000, 5000, 10000]);
  assert.deepEqual(queries, [
    { time: 10000, names: packages.map((p) => p.name) },
    { time: 15000, names: ['@elog/core', '@elog/plugin-sdk'] },
    { time: 25000, names: ['@elog/plugin-sdk'] },
  ]);
  assert.equal(result.timedOut, false);
  assert.deepEqual(result.pending, []);
  assert.equal(result.registry['@elog/cli'].integrity, 'fixture-integrity');
  assert.equal(snapshots[0].registry['@elog/core'].exists, false);
  assert.equal(snapshots.at(-1).registry['@elog/core'].exists, true);
});

test('publication verification recovers from temporary registry errors', async () => {
  let clock = 0;
  let calls = 0;
  const result = await verifyRegistry([pkg], 'beta', {
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
    },
    query: async () => ({
      [pkg.name]:
        ++calls === 1 ? { error: 'npm registry HTTP 503' } : { exists: true, tag: pkg.newVersion },
    }),
  });
  assert.equal(calls, 2);
  assert.equal(result.timedOut, false);
  assert.deepEqual(result.pending, []);
});

test('publication verification stops after five minutes and preserves unresolved package states', async () => {
  let clock = 0;
  const waits = [];
  const errors = [
    { exists: false, tag: pkg.currentVersion },
    { exists: true, tag: pkg.currentVersion },
    { error: 'network unavailable' },
  ];
  const packages = errors.map((_, i) => ({ ...pkg, name: `@elog/fixture-${i}` }));
  const result = await verifyRegistry(packages, 'beta', {
    now: () => clock,
    sleep: async (ms) => {
      waits.push(ms);
      clock += ms;
    },
    query: async (pending) => {
      assert.ok(clock < 300000);
      // Query time counts against the deadline too.
      clock += 1000;
      return Object.fromEntries(pending.map((p, i) => [p.name, errors[i]]));
    },
  });
  assert.deepEqual(waits.slice(0, 5), [10000, 5000, 10000, 20000, 30000]);
  assert.ok(waits.slice(5).every((ms) => ms <= 30000));
  assert.equal(clock, 300000);
  assert.equal(result.timedOut, true);
  assert.deepEqual(
    result.pending,
    packages.map((p) => p.name),
  );
  assert.deepEqual(Object.values(result.registry), errors);
});

test('publication verification skips waiting when there are no changed packages', async () => {
  const result = await verifyRegistry([], 'beta', {
    sleep: async () => {
      assert.fail('unexpected wait');
    },
    query: async () => {
      assert.fail('unexpected query');
    },
  });
  assert.equal(result.timedOut, false);
  assert.deepEqual(result.pending, []);
});

test('Nx release creates commit and tags without an upstream, then the workflow pushes atomically', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const dir = mkdtempSync(path.join(tmpdir(), 'elog-release-git-test-'));
  const repo = path.join(dir, 'repo');
  const remote = path.join(dir, 'remote.git');
  mkdirSync(repo);
  const git = (...args) =>
    execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: 'pipe' }).trim();
  const writeJson = (file, value) =>
    writeFileSync(path.join(repo, file), JSON.stringify(value, null, 2));
  try {
    execFileSync('git', ['init', '--bare', '--initial-branch=v1', remote], { stdio: 'pipe' });
    git('init', '--initial-branch=v1');
    git('config', 'user.name', 'Release test');
    git('config', 'user.email', 'release@example.invalid');
    git('config', 'commit.gpgsign', 'false');
    git('config', 'tag.gpgsign', 'false');
    git('config', 'core.hooksPath', '/dev/null');
    git('config', 'push.default', 'simple');
    git('config', 'push.autoSetupRemote', 'false');
    writeFileSync(path.join(repo, '.gitignore'), 'node_modules\n.nx\n.published.json\n');
    symlinkSync(path.join(root, 'node_modules'), path.join(repo, 'node_modules'), 'dir');
    const { release } = JSON.parse(readFileSync(path.join(root, 'nx.json'), 'utf8'));
    release.projects = ['@elog/release-fixture'];
    release.version.versionActionsOptions = { skipLockFileUpdate: true };
    writeJson('nx.json', { release });
    writeJson('package.json', {
      name: 'release-fixture-workspace',
      private: true,
      workspaces: ['packages/*'],
    });
    mkdirSync(path.join(repo, 'packages/fixture'), { recursive: true });
    writeJson('packages/fixture/package.json', {
      name: '@elog/release-fixture',
      version: '1.0.0-beta.1',
    });
    writeJson('packages/fixture/project.json', {
      name: '@elog/release-fixture',
      targets: {
        'nx-release-publish': {
          executor: 'nx:run-commands',
          options: { command: 'node mock-publish.cjs', forwardAllArgs: false },
        },
      },
    });
    // Exercise real Nx version/changelog/git operations while replacing the npm upload boundary.
    writeFileSync(
      path.join(repo, 'mock-publish.cjs'),
      `const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
if (process.env.NX_DRY_RUN !== 'true') {
  fs.writeFileSync('.published.json', JSON.stringify({
    version: JSON.parse(fs.readFileSync('packages/fixture/package.json')).version,
    commit: git('rev-parse', 'HEAD'),
    changelog: git('show', 'HEAD:packages/fixture/CHANGELOG.md'),
  }));
}
`,
    );
    git('add', '.');
    git('commit', '-m', 'feat: initial fixture');
    git('tag', '-a', '@elog/release-fixture@1.0.0-beta.1', '-m', 'initial release');
    git('remote', 'add', 'origin', remote);
    git('push', 'origin', 'HEAD:refs/heads/v1', '--follow-tags');
    const source = git('rev-parse', 'HEAD');
    const tag = '@elog/release-fixture@1.0.0-beta.2';
    const nxPackage = JSON.parse(readFileSync(path.join(root, 'node_modules/nx/package.json')));
    const args = [
      path.join(root, 'node_modules/nx', nxPackage.bin.nx),
      'release',
      '1.0.0-beta.2',
      '--preid=beta',
      '--yes',
    ];
    const options = {
      cwd: repo,
      env: {
        ...process.env,
        NX_DAEMON: 'false',
        NX_ISOLATE_PLUGINS: 'false',
        NX_SKIP_NX_CACHE: 'true',
        NX_WORKSPACE_ROOT_PATH: repo,
        HUSKY: '0',
      },
      encoding: 'utf8',
      timeout: 60000,
      maxBuffer: 8 * 1024 * 1024,
    };
    const preview = spawnSync(process.execPath, [...args, '--dry-run'], options);
    assert.equal(preview.status, 0, preview.stdout + preview.stderr);
    assert.equal(git('rev-parse', 'HEAD'), source);
    assert.equal(git('status', '--porcelain'), '');
    assert.equal(git('tag', '--list', tag), '');
    assert.equal(existsSync(path.join(repo, '.published.json')), false);

    const result = spawnSync(process.execPath, args, options);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const published = JSON.parse(readFileSync(path.join(repo, '.published.json')));
    assert.equal(published.version, '1.0.0-beta.2');
    assert.notEqual(published.commit, source);
    assert.match(published.changelog, /1\.0\.0-beta\.2/);
    assert.equal(git('rev-parse', `${tag}^{}`), published.commit);
    assert.equal(git('status', '--porcelain'), '');
    assert.equal(git('ls-remote', 'origin', 'refs/heads/v1').split(/\s/)[0], source);
    assert.equal(git('ls-remote', 'origin', `refs/tags/${tag}`), '');
    git('push', '--atomic', 'origin', 'HEAD:refs/heads/v1', '--follow-tags');
    assert.equal(git('ls-remote', 'origin', 'refs/heads/v1').split(/\s/)[0], published.commit);
    assert.equal(
      git('ls-remote', 'origin', `refs/tags/${tag}^{}`).split(/\s/)[0],
      published.commit,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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
