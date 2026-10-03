import path from 'node:path';
import { describe, it } from 'vitest';
import { expectExitCode, expectOutputContains, expectSyncArtifacts } from './helpers/assertions';
import { filterSyncCases, loadSyncCases, syncCaseTitle } from './helpers/case-loader';
import { repoRootFromE2e, runElog } from './helpers/run-cli';
import {
  copyIntoWorkspace,
  createTempWorkspace,
  preserveWorkspaceMessage,
} from './helpers/temp-workspace';

const repoRoot = repoRootFromE2e();
const stableOnly =
  process.env.ELOG_E2E_STABLE === '1' || process.env.ELOG_E2E_STABLE?.toLowerCase() === 'true';
if (stableOnly) {
  // Clear manual filters before importing configs so Stable always loads every image profile.
  delete process.env.ELOG_E2E_CASE;
  delete process.env.ELOG_E2E_IMAGE;
}
const loadedCases = await loadSyncCases(repoRoot);
const syncCases = filterSyncCases(loadedCases, process.env.ELOG_E2E_CASE, stableOnly);

if (stableOnly) {
  if (syncCases.length === 0) throw new Error('No stable e2e sync cases found');
  const missing = syncCases.flatMap((syncCase) => {
    const names = syncCase.requiredEnv.filter((name) => !process.env[name]);
    return names.length ? [`${syncCase.title}: ${names.join(', ')}`] : [];
  });
  if (missing.length) {
    throw new Error(
      `Stable e2e requires all platform credentials before syncing:\n${missing.join('\n')}`,
    );
  }
}

describe('elog sync e2e matrix', () => {
  for (const syncCase of syncCases) {
    const missingEnv = syncCase.requiredEnv.filter((name) => !process.env[name]);
    const runCase = missingEnv.length === 0 ? it : it.skip;
    if (missingEnv.length > 0) {
      console.info(
        `Skipping e2e sync case ${syncCase.id}: missing required env ${missingEnv.join(', ')}`,
      );
    }

    runCase(syncCaseTitle(syncCase, missingEnv), async () => {
      const workspace = createTempWorkspace(`elog-e2e-${syncCase.id}-`);
      let passed = false;

      try {
        const caseRoot = path.join(repoRoot, 'tests/e2e/cases', syncCase.id);
        copyIntoWorkspace(caseRoot, workspace.path, [syncCase.configFile]);

        const firstRun = await runElog(['sync', '--config', syncCase.configFile], {
          cwd: workspace.path,
          repoRoot,
          env: syncCase.env,
        });

        expectExitCode(firstRun, 0);
        expectOutputContains(firstRun, '同步结果');
        expectSyncArtifacts(workspace.path, syncCase.expected);

        const secondRun = await runElog(['sync', '--config', syncCase.configFile], {
          cwd: workspace.path,
          repoRoot,
          env: syncCase.env,
        });

        expectExitCode(secondRun, 0);
        expectOutputContains(secondRun, '同步结果');
        expectSyncArtifacts(workspace.path, syncCase.expected);

        await syncCase.assert?.({
          firstRun,
          secondRun,
          workspace: workspace.path,
          repoRoot,
        });

        passed = true;
      } finally {
        if (!passed) {
          console.info(preserveWorkspaceMessage(workspace.path));
        }
        workspace.cleanup(passed);
      }
    });
  }
});
