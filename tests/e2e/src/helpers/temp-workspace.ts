import fs from 'node:fs';
import path from 'node:path';
import type { TempWorkspace } from './types';

export function createTempWorkspace(prefix = 'elog-e2e-'): TempWorkspace {
  const tmpRoot = path.join(path.resolve(process.cwd(), '../..'), 'tests/e2e/.tmp');
  fs.mkdirSync(tmpRoot, { recursive: true });

  const workspacePath = fs.mkdtempSync(path.join(tmpRoot, prefix));

  return {
    path: workspacePath,
    cleanup(remove = true) {
      const keepTmp =
        process.env.ELOG_E2E_KEEP_TMP === '1' ||
        process.env.ELOG_E2E_KEEP_TMP?.toLowerCase() === 'true';

      if (remove && !keepTmp) {
        fs.rmSync(workspacePath, { recursive: true, force: true });
      } else {
        console.info(`Preserved e2e workspace: ${workspacePath}`);
      }
    },
  };
}

export function copyIntoWorkspace(sourceRoot: string, workspace: string, entries: string[]): void {
  for (const entry of entries) {
    const source = path.join(sourceRoot, entry);
    const destination = path.join(workspace, entry);
    fs.cpSync(source, destination, { recursive: true });
  }
}

export function copyFileIntoWorkspace(
  sourceFile: string,
  workspace: string,
  targetName?: string,
): void {
  const destination = path.join(workspace, targetName ?? path.basename(sourceFile));
  fs.cpSync(sourceFile, destination, { recursive: true });
}

export function preserveWorkspaceMessage(workspace: string): string {
  return `E2E workspace preserved at ${workspace}`;
}
