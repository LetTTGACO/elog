import { describe, it } from 'vitest';
import { loadCommandCases } from './helpers/command-case-loader';
import { repoRootFromE2e, runElog } from './helpers/run-cli';
import { createTempWorkspace, preserveWorkspaceMessage } from './helpers/temp-workspace';

const repoRoot = repoRootFromE2e();
const commandCases = await loadCommandCases(repoRoot);

describe('elog command e2e', () => {
  for (const commandCase of commandCases) {
    it.skipIf(commandCase.skip)(
      commandCase.id,
      typeof commandCase.skip === 'string' ? commandCase.skip : undefined,
      async () => {
        const workspace = createTempWorkspace(`elog-e2e-${commandCase.id}-`);
        let passed = false;

        try {
          await commandCase.setup?.({
            workspace: workspace.path,
            repoRoot,
          });

          const result = await runElog(commandCase.command, {
            cwd: workspace.path,
            repoRoot,
            env: commandCase.env,
          });

          await commandCase.expect({
            result,
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
      },
    );
  }
});
