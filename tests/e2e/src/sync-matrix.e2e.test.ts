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
const loadedCases = await loadSyncCases(repoRoot);
const stableOnly =
  process.env.ELOG_E2E_STABLE === '1' || process.env.ELOG_E2E_STABLE?.toLowerCase() === 'true';
const syncCases = filterSyncCases(loadedCases, process.env.ELOG_E2E_CASE, stableOnly);

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
        });

        expectExitCode(firstRun, 0);
        expectOutputContains(firstRun, '同步结果');
        expectSyncArtifacts(workspace.path, syncCase.expected);

        const secondRun = await runElog(['sync', '--config', syncCase.configFile], {
          cwd: workspace.path,
          repoRoot,
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
