import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const readJson = (file, fallback = null) =>
  existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback;
const writeJson = (file, data) => writeFileSync(file, JSON.stringify(data, null, 2));
const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const escape = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\|/g, '&#124;')
    .replace(/\r?\n/g, ' ')
    .replace(/([\\`*_[\]])/g, '\\$1');
const status = (value) =>
  ({ success: '✅ 通过', failure: '❌ 失败', cancelled: '⏹ 已取消', skipped: '— 未执行' })[value] ??
  '— 未执行';

function manifests() {
  const directories = ['packages', 'plugins/from', 'plugins/transform', 'plugins/to'];
  return directories
    .flatMap((parent) =>
      readdirSync(parent, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => `${parent}/${entry.name}`),
    )
    .filter((root) => existsSync(`${root}/package.json`))
    .map((root) => ({ root, ...readJson(`${root}/package.json`) }));
}

async function registryState(name, version, channel, currentVersion, signal) {
  const request = async (url) => {
    const timeout = AbortSignal.timeout(15000);
    const response = await fetch(url, {
      signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`npm registry HTTP ${response.status}`);
    return response.json();
  };
  try {
    const encoded = encodeURIComponent(name);
    const [manifest, tags, current] = await Promise.all([
      request(`https://registry.npmjs.org/${encoded}/${encodeURIComponent(version)}`),
      request(`https://registry.npmjs.org/-/package/${encoded}/dist-tags`),
      currentVersion
        ? request(`https://registry.npmjs.org/${encoded}/${encodeURIComponent(currentVersion)}`)
        : null,
    ]);
    return {
      exists: manifest?.version === version,
      tag: tags?.[channel] ?? null,
      integrity: manifest?.dist?.integrity ?? null,
      ...(currentVersion ? { currentExists: current?.version === currentVersion } : {}),
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function mapRegistry(packages, channel, includeCurrent = false, signal) {
  const results = {};
  // Bound registry traffic while keeping a failed package from hiding other results.
  for (let index = 0; index < packages.length; index += 4) {
    await Promise.all(
      packages.slice(index, index + 4).map(async (pkg) => {
        results[pkg.name] = await registryState(
          pkg.name,
          pkg.newVersion,
          channel,
          includeCurrent ? pkg.currentVersion : undefined,
          signal,
        );
      }),
    );
  }
  return results;
}

export async function verifyRegistry(
  packages,
  channel,
  {
    query = mapRegistry,
    sleep: wait = sleep,
    now = () => performance.now(),
    onAttempt = () => {},
  } = {},
) {
  const start = now();
  const deadline = start + 300000;
  const registry = {};
  let pending = packages;
  let attempts = 0;
  let delay = 10000;
  const retryDelays = [5000, 10000, 20000, 30000];
  while (pending.length && now() < deadline) {
    await wait(Math.min(delay, deadline - now()));
    const remaining = Math.ceil(deadline - now());
    if (remaining <= 0) break;
    // Share the deadline across all request batches, not just each HTTP request.
    Object.assign(registry, await query(pending, channel, false, AbortSignal.timeout(remaining)));
    attempts += 1;
    pending = pending.filter((pkg) => {
      const state = registry[pkg.name];
      return !state || state.error || !state.exists || state.tag !== pkg.newVersion;
    });
    onAttempt({
      attempt: attempts,
      elapsedMs: Math.round(now() - start),
      pending: pending.map((pkg) => pkg.name),
      registry: { ...registry },
    });
    delay = retryDelays[Math.min(attempts - 1, retryDelays.length - 1)];
  }
  return {
    registry,
    attempts,
    elapsedMs: Math.round(now() - start),
    pending: pending.map((pkg) => pkg.name),
    timedOut: pending.length > 0,
  };
}

export function assertPublishable(report) {
  const issues = report.packages
    .filter((pkg) => pkg.newVersion)
    .flatMap((pkg) => {
      const state = report.registryBefore?.[pkg.name];
      if (!state || state.error)
        return [`${pkg.name}：npm 查询失败，无法确认版本可发布（${state?.error ?? '无查询结果'}）`];
      const errors = [];
      if (state.exists)
        errors.push(
          `${pkg.name}@${pkg.newVersion}：目标版本已存在于 npm，请核对历史 tag 或按失败恢复流程处理`,
        );
      if (!pkg.baseline && state.currentExists)
        errors.push(`${pkg.name}@${pkg.currentVersion}：基线版本已发布，但缺少对应 Git tag`);
      return errors;
    });
  if (issues.length) throw new Error(`发布前检查未通过：\n${issues.join('\n')}`);
}

async function plan(dir) {
  const { releaseVersion, releaseChangelog } = await import('nx/release');
  const channel = process.env.RELEASE_CHANNEL;
  const dryRun = process.env.RELEASE_DRY_RUN === 'true';
  const version = process.env.RELEASE_VERSION || undefined;
  const sourceSha = git('rev-parse', 'HEAD');
  // Planning must never stage, commit, tag, push, or create a remote release.
  const options = {
    dryRun: true,
    stageChanges: false,
    gitCommit: false,
    gitTag: false,
    gitPush: false,
  };
  const versions = await releaseVersion({
    ...options,
    specifier: version,
    preid: channel === 'beta' ? 'beta' : undefined,
  });
  const packageManifests = manifests();
  const packages = Object.entries(versions.projectsVersionData).map(([name, data]) => {
    const manifest = packageManifests.find((pkg) => pkg.name === name);
    const tag = `${name}@${data.currentVersion}`;
    let baseline = null;
    try {
      git('rev-parse', '--verify', `refs/tags/${tag}`);
      baseline = tag;
    } catch {}
    const commits = baseline
      ? git(
          'log',
          '--no-merges',
          '--format=%H%x09%s',
          `${baseline}..${sourceSha}`,
          '--',
          manifest.root,
        )
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const [sha, ...subject] = line.split('\t');
            return { sha, subject: subject.join('\t') };
          })
      : [];
    return {
      name,
      root: manifest.root,
      ...data,
      baseline,
      commits,
      reason: !data.newVersion
        ? '无版本变化'
        : version
          ? '显式指定版本'
          : data.currentVersion.includes('-')
            ? '预发布版本递增（Nx）'
            : 'Conventional Commits（Nx）',
      dependencies: manifest.dependencies ?? {},
    };
  });
  const report = {
    sourceSha,
    channel,
    dryRun,
    version,
    packages,
    repository: process.env.GITHUB_REPOSITORY,
    generatedAt: new Date().toISOString(),
  };
  writeJson(path.join(dir, 'plan.json'), report);
  // The same read-only gate protects previews and real releases before Nx mutates versions.
  report.registryBefore = await mapRegistry(
    packages.filter((pkg) => pkg.newVersion),
    channel,
    true,
  );
  writeJson(path.join(dir, 'plan.json'), report);
  assertPublishable(report);
  const changelog = await releaseChangelog({
    ...options,
    createRelease: false,
    versionData: versions.projectsVersionData,
    releaseGraph: versions.releaseGraph,
    version: versions.workspaceVersion,
    to: sourceSha,
  });
  report.changelogs = Object.fromEntries(
    Object.entries(changelog.projectChangelogs ?? {}).map(([name, entry]) => [
      name,
      entry.contents,
    ]),
  );
  writeJson(path.join(dir, 'plan.json'), report);
}

async function run(dir, id, command, args) {
  if (!/^[a-z_]+$/.test(id) || !command) throw new Error('Expected run <step_id> <command> [args]');
  const start = Date.now();
  const file = path.join(dir, `${id}.log`);
  writeFileSync(file, '');
  const child = spawn(command, args, { stdio: ['inherit', 'pipe', 'pipe'] });
  for (const [stream, output] of [
    [child.stdout, process.stdout],
    [child.stderr, process.stderr],
  ]) {
    stream.on('data', (data) => {
      appendFileSync(file, data);
      output.write(data);
    });
  }
  const result = await new Promise((resolve) => {
    child.on('error', (error) => {
      appendFileSync(file, error.message);
      resolve(1);
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
  writeJson(path.join(dir, `${id}.step.json`), {
    durationMs: Date.now() - start,
    outcome: result === 0 ? 'success' : 'failure',
    command: [command, ...args],
  });
  process.exitCode = result;
}

export function packageResult(pkg, report, steps, actual) {
  if (!pkg.newVersion) return '保持不变';
  if (report.dryRun) {
    const before = report.registryBefore?.[pkg.name];
    if (!before || before.error) return '❌ npm 状态未确认，阻止发布';
    if (before.exists) return '❌ 目标版本已存在，阻止发布';
    if (!pkg.baseline && before.currentExists) return '❌ 已发布基线缺少 Git tag，阻止发布';
    return steps.release?.outcome === 'success'
      ? '预演通过，计划发布'
      : '计划发布；发布预演未通过或未执行';
  }
  if (!['success', 'failure', 'cancelled'].includes(steps.release?.outcome)) return '未执行发布';
  const observed = actual?.registry?.[pkg.name];
  if (!observed || observed.error) return '⚠️ npm 结果未确认';
  if (!observed.exists) return '❌ 目标版本不存在（失败或未执行）';
  if (observed.tag !== pkg.newVersion)
    return `⚠️ 版本存在，${report.channel} 指向 ${observed.tag ?? '空'}`;
  const before = report.registryBefore?.[pkg.name];
  if (!before || before.error) return '✅ npm 版本及渠道已确认；发布前状态未知';
  return before.exists ? '✅ 目标版本原已存在，渠道已确认' : '✅ 新版本及渠道已确认';
}

export function renderSummary({
  report,
  steps = {},
  metrics = {},
  tests = [],
  actual,
  runUrl,
  channel,
  dryRun,
}) {
  channel = report?.channel ?? channel;
  dryRun = report?.dryRun ?? dryRun;
  const packages = report?.packages ?? [];
  const changed = packages.filter((pkg) => pkg.newVersion);
  const checks = [
    ['install', '依赖安装'],
    ['build', '构建'],
    ['typecheck', '类型检查'],
    ['report_test', '发布报告测试'],
    ['test', '单元／集成测试'],
    ['prepare', '源码及工作区检查'],
    ['plan', '版本与 changelog 计划'],
    ['release', dryRun ? '打包及发布预演' : 'npm 发布流程'],
  ];
  if (!dryRun) checks.push(['push', 'Git 提交及标签推送'], ['verify', 'npm / Git 结果核验']);
  const failures = Object.entries(steps).filter(([, step]) => step.outcome === 'failure');
  const cancellations = Object.entries(steps).filter(([, step]) => step.outcome === 'cancelled');
  let registryError;
  if (report) {
    try {
      assertPublishable(report);
    } catch (error) {
      registryError = error.message;
    }
  }
  const success =
    !registryError &&
    failures.length === 0 &&
    checks.every(([id]) => steps[id]?.outcome === 'success');
  const title = `${channel === 'beta' ? 'Beta ' : '稳定版'}${dryRun ? '发布预演' : '发布结果'}`;
  const repository = report?.repository;
  const baseUrl = repository ? `https://github.com/${repository}` : null;
  const totals = tests.reduce(
    (sum, test) => {
      for (const key of Object.keys(sum)) sum[key] += test.counts[key] ?? 0;
      return sum;
    },
    { passed: 0, failed: 0, skipped: 0, pending: 0 },
  );
  const lines = [
    `# ${title}`,
    '',
    `**${cancellations.length ? '⏹ 已取消' : success ? '✅ 已完成' : failures.length || registryError ? '❌ 存在失败' : '⏹ 未完成'}**`,
    '',
    `- 源码：${report ? (baseUrl ? `[${report.sourceSha.slice(0, 8)}](${baseUrl}/commit/${report.sourceSha})` : report.sourceSha.slice(0, 8)) : '版本计划尚未生成'}`,
    `- 渠道：\`${escape(channel)}\` · 计划升级 **${changed.length}** 个包 · 保持不变 **${packages.length - changed.length}** 个包`,
    dryRun
      ? '- 本次仅预演：未上传 npm，未推送版本提交或标签；实际发布授权尚未验证。'
      : '- npm 版本状态与 Git 推送结果分别记录在下方。',
    runUrl ? `- [步骤日志与报告附件](${runUrl})` : '',
    '',
  ];
  if (failures.length)
    lines.push(
      `失败步骤：${failures.map(([id]) => escape(id)).join('、')}。后续步骤可能未执行。`,
      '',
    );
  if (cancellations.length)
    lines.push(
      `取消步骤：${cancellations.map(([id]) => escape(id)).join('、')}。${dryRun ? '' : '取消不会撤回已上传的 npm 版本；请结合逐包核验结果和恢复附件处理。'}`,
      '',
    );
  const fallbackPackages = packages.filter((pkg) => !pkg.baseline);
  if (fallbackPackages.length) {
    lines.push(
      `⚠️ ${fallbackPackages.length} 个包没有匹配的版本 tag，使用 manifest 回退：${fallbackPackages.map((pkg) => escape(pkg.name)).join('、')}。`,
      '',
    );
  }
  lines.push(
    '## 包版本变化',
    '',
    '| 包 | 当前版本 | 目标版本 | 版本依据 | 结果 |',
    '| --- | --- | --- | --- | --- |',
  );
  for (const pkg of packages)
    lines.push(
      `| ${escape(pkg.name)} | ${escape(pkg.currentVersion)} | ${escape(pkg.newVersion ?? '—')} | ${escape(pkg.reason)} | ${escape(packageResult(pkg, report, steps, actual))} |`,
    );
  if (!report) lines.push('', '尚无可用版本计划，请查看失败步骤。');
  if (report) {
    lines.push(
      '',
      '## npm 发布前检查',
      '',
      '| 包 | npm 渠道当前指向 | 目标版本 | npm 中的目标版本 |',
      '| --- | --- | --- | --- |',
    );
    for (const pkg of changed) {
      const state = report.registryBefore?.[pkg.name];
      lines.push(
        `| ${escape(pkg.name)} | ${escape(state?.tag ?? '—')} | ${escape(pkg.newVersion)} | ${!state || state.error ? '⚠️ 查询未确认' : state.exists ? '❌ 已存在' : '✅ 尚未发布'} |`,
      );
    }
    lines.push(
      '',
      registryError ? escape(registryError) : '✅ 发布前检查通过。',
      '',
      '预演与正式发布使用相同的只读检查；npm 渠道指针不用于替代 Git 版本基线。',
    );
  }
  lines.push(
    '',
    '当前版本以包级 Git tag 为基线；没有匹配 tag 时由 Nx 回退到 manifest。',
    '',
    '## 验证结果',
    '',
    '| 检查 | 结果 | 耗时 |',
    '| --- | --- | --- |',
  );
  for (const [id, label] of checks)
    lines.push(
      `| ${label} | ${status(steps[id]?.outcome)} | ${metrics[id] ? `${(metrics[id].durationMs / 1000).toFixed(1)}s` : '—'} |`,
    );
  lines.push(
    '| CLI E2E | — 未执行 | — |',
    '| 真实平台 E2E | — 未执行 | — |',
    '',
    '本流程关闭 Nx 缓存。测试数量仅统计收到的结构化结果，测试步骤状态决定整体是否通过。',
    '',
  );
  if (tests.length) {
    lines.push(
      `测试：**${totals.passed} 通过 · ${totals.failed} 失败 · ${totals.skipped} 跳过 · ${totals.pending} 未完成**（${tests.length} 个包报告）。`,
      '',
      '<details><summary>各包测试明细</summary>',
      '',
      '| 包 | 文件 | 通过 | 失败 | 跳过 | 未完成 |',
      '| --- | --- | --- | --- | --- | --- |',
    );
    for (const test of tests)
      lines.push(
        `| ${escape(test.name)} | ${test.files} | ${test.counts.passed} | ${test.counts.failed} | ${test.counts.skipped} | ${test.counts.pending} |`,
      );
    for (const test of tests.filter((item) => item.failures.length))
      lines.push(
        '',
        `**${escape(test.name)}**`,
        '',
        ...test.failures.slice(0, 20).map((failure) => `- ${escape(failure)}`),
      );
    lines.push('', '</details>', '');
  } else lines.push('尚未收到测试统计；请以测试步骤状态和日志为准。', '');
  lines.push('## 变更与产物', '');
  for (const pkg of changed) {
    lines.push(
      `<details><summary>${escape(pkg.name)} → ${escape(pkg.newVersion)}</summary>`,
      '',
      `版本依据：${escape(pkg.reason)}。`,
      '',
      pkg.baseline && baseUrl
        ? `[包级版本比较](${baseUrl}/compare/${encodeURIComponent(pkg.baseline)}...${report.sourceSha})`
        : '⚠️ 缺少匹配的包级版本 tag；当前版本取自 manifest，未推断包目录提交范围。',
      '',
      '### Nx changelog',
      '',
      report.changelogs?.[pkg.name] ?? '未生成 changelog。',
      '',
      '### 包目录提交',
      '',
      ...pkg.commits.map(
        (commit) =>
          `- ${baseUrl ? `[${commit.sha.slice(0, 8)}](${baseUrl}/commit/${commit.sha})` : commit.sha.slice(0, 8)} ${escape(commit.subject)}`,
      ),
    );
    if (!pkg.commits.length)
      lines.push('没有可列出的包目录提交；版本计算和相关变更以 Nx 结果为准。');
    lines.push(
      '',
      `计划标签：\`${escape(`${pkg.name}@${pkg.newVersion}`)}\``,
      '',
      '内部依赖声明：',
      '',
    );
    const dependencies = Object.entries(pkg.dependencies).filter(([name]) =>
      name.startsWith('@elog/'),
    );
    lines.push(...dependencies.map(([name, range]) => `- ${escape(name)}：\`${escape(range)}\``));
    if (!dependencies.length) lines.push('无。');
    if (!dryRun) {
      lines.push(
        '',
        `远端标签核验：${actual?.git?.tags?.[pkg.name] === true ? '✅ 指向本次版本提交' : '⚠️ 尚未确认指向本次版本提交'}。`,
      );
    }
    if (!dryRun && actual?.registry?.[pkg.name]?.exists)
      lines.push(
        '',
        `[npm 目标版本](https://www.npmjs.com/package/${pkg.name}/v/${pkg.newVersion})`,
      );
    lines.push('', '</details>', '');
  }
  if (!dryRun) {
    lines.push(
      '## Git 与 npm 核验',
      '',
      `Git 推送步骤：${status(steps.push?.outcome)}。`,
      '',
      actual?.git?.commit
        ? `版本操作后的本地提交：\`${actual.git.commit}\`。`
        : '未取得版本操作后的 Git 提交。',
      '',
      actual?.git?.error
        ? `⚠️ ${escape(actual.git.error)}`
        : actual?.git?.remoteContainsCommit === true
          ? '✅ 远端 v1 指向该提交，计划版本标签已逐一核验。'
          : '⚠️ Git 远端提交或标签尚未全部确认。',
      '',
      'npm 结果来自执行后的只读 registry 查询；版本存在与渠道匹配分别核验。',
      '',
    );
  }
  lines.push(
    '## 报告附件',
    '',
    '下载本次运行的 `release-report` artifact，包含完整 Markdown、版本计划 JSON、逐包测试结果和各阶段日志。',
    !dryRun
      ? '真实发布开始后会在网络核验前保存 recovery 快照，包含 Git bundle、工作区差异和版本文件；失败或取消时另存 release-recovery 附件。'
      : '',
    '',
    '详细打包文件清单见 `release.log`。预演计划仅对应上方源码提交；真实发布将重新计算。',
    '',
  );
  return lines.filter((line) => line !== undefined).join('\n');
}

function recovery(dir) {
  const report = readJson(path.join(dir, 'plan.json'));
  if (!report || report.dryRun) return;
  const destination = path.join(dir, 'recovery');
  mkdirSync(destination, { recursive: true });
  // Cancellation can interrupt versioning before its commit or tags exist.
  writeJson(path.join(destination, 'state.json'), {
    sourceSha: report.sourceSha,
    head: git('rev-parse', 'HEAD'),
    status: git('status', '--porcelain'),
  });
  writeFileSync(
    path.join(destination, 'worktree.patch'),
    execFileSync('git', ['diff', '--binary', 'HEAD']),
  );
  const files = [
    'package.json',
    'pnpm-lock.yaml',
    ...report.packages.flatMap((pkg) => [`${pkg.root}/package.json`, `${pkg.root}/CHANGELOG.md`]),
  ];
  for (const file of files) {
    if (!existsSync(file)) continue;
    const target = path.join(destination, 'files', file);
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(file, target);
  }
  copyFileSync(path.join(dir, 'plan.json'), path.join(destination, 'plan.json'));
  git('bundle', 'create', path.resolve(destination, 'release.bundle'), '--all');
}

async function verify(dir) {
  const report = readJson(path.join(dir, 'plan.json'));
  if (!report || report.dryRun) return;
  const changed = report.packages.filter((pkg) => pkg.newVersion);
  const actual = { registry: {}, git: {}, verification: { attempts: [] } };
  writeJson(path.join(dir, 'actual.json'), actual);
  if (changed.length) console.log('等待 10 秒后核验 npm，查询与重试总时限为 5 分钟。');
  const observed = await verifyRegistry(changed, report.channel, {
    onAttempt: (snapshot) => {
      actual.registry = snapshot.registry;
      actual.verification.attempts.push(snapshot);
      writeJson(path.join(dir, 'actual.json'), actual);
      console.log(
        `npm 核验第 ${snapshot.attempt} 轮：${changed.length - snapshot.pending.length}/${changed.length} 个包已确认；待确认：${snapshot.pending.join(', ') || '无'}`,
      );
    },
  });
  actual.registry = observed.registry;
  actual.verification.elapsedMs = observed.elapsedMs;
  actual.verification.timedOut = observed.timedOut;
  writeJson(path.join(dir, 'actual.json'), actual);
  if (observed.timedOut)
    console.error(`npm 核验超过 5 分钟，仍未确认：${observed.pending.join(', ')}`);
  try {
    actual.git.commit = git('rev-parse', 'HEAD');
    const refs = git(
      'ls-remote',
      'origin',
      'refs/heads/v1',
      ...changed.flatMap((pkg) => [
        `refs/tags/${pkg.name}@${pkg.newVersion}`,
        `refs/tags/${pkg.name}@${pkg.newVersion}^{}`,
      ]),
    );
    const remote = Object.fromEntries(
      refs
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [sha, ref] = line.split(/\s+/);
          return [ref, sha];
        }),
    );
    // A concurrent commit on v1 must not turn an unverified push into a success.
    actual.git.remoteContainsCommit = remote['refs/heads/v1'] === actual.git.commit;
    actual.git.tags = Object.fromEntries(
      changed.map((pkg) => {
        const ref = `refs/tags/${pkg.name}@${pkg.newVersion}`;
        return [pkg.name, (remote[`${ref}^{}`] ?? remote[ref]) === actual.git.commit];
      }),
    );
    if (Object.values(actual.git.tags).some((match) => !match))
      actual.git.remoteContainsCommit = false;
  } catch (error) {
    actual.git.error = error.message;
  }
  writeJson(path.join(dir, 'actual.json'), actual);
  if (
    !actual.git.remoteContainsCommit ||
    changed.some((pkg) => {
      const state = actual.registry[pkg.name];
      return !state || state.error || !state.exists || state.tag !== pkg.newVersion;
    })
  )
    process.exitCode = 1;
}

function summary(dir) {
  const steps = JSON.parse(process.env.RELEASE_STEPS || '{}');
  const metrics = Object.fromEntries(
    readdirSync(dir)
      .filter((file) => file.endsWith('.step.json'))
      .map((file) => [file.slice(0, -10), readJson(path.join(dir, file))]),
  );
  const testsDir = path.join(dir, 'tests');
  const tests = existsSync(testsDir)
    ? readdirSync(testsDir)
        .filter((file) => file.endsWith('.json'))
        .map((file) => readJson(path.join(testsDir, file)))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const input = {
    report: readJson(path.join(dir, 'plan.json')),
    metrics,
    tests,
    actual: readJson(path.join(dir, 'actual.json')),
    steps,
    channel: process.env.RELEASE_CHANNEL,
    dryRun: process.env.RELEASE_DRY_RUN === 'true',
    runUrl: process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null,
  };
  writeJson(path.join(dir, 'summary-data.json'), input);
  const markdown = renderSummary(input);
  writeFileSync(path.join(dir, 'summary.md'), markdown);
  // Keep the full report in the artifact if a large history exceeds GitHub's limit.
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      Buffer.byteLength(markdown) < 950000
        ? markdown
        : `${markdown.slice(0, 100000)}\n\n报告过长，完整内容见 release-report 附件。\n`,
    );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const dir = process.env.RELEASE_REPORT_DIR;
  if (!dir) throw new Error('RELEASE_REPORT_DIR is required');
  mkdirSync(dir, { recursive: true });
  const [command, ...args] = process.argv.slice(2);
  if (command === 'plan') await plan(dir);
  else if (command === 'run') await run(dir, ...args.slice(0, 2), args.slice(2));
  else if (command === 'verify') await verify(dir);
  else if (command === 'recovery') recovery(dir);
  else if (command === 'summary') summary(dir);
  else throw new Error(`Unknown command: ${command}`);
}
