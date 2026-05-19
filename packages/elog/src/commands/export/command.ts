import elog from '../../node-entry';
import type { ElogConfig } from '../../types/common';
import type { WorkflowResult } from '../../runtime/types';
import { detectPackageManager, installPackages } from '../init/package-manager';
import type { InstallPackagesOptions } from '../init/package-manager';
import { loadBuiltInPluginRegistry } from '../init/registry';
import type { InitSelection, PluginRegistry } from '../init/types';
import { runExportWizard } from '../init/wizard';
import { reportWorkflowResults, throwOnFailedWorkflow } from '../sync/results';
import { buildExportRuntimeConfig } from './runtime-config';

export interface RunExportCommandOptions {
  cwd: string;
  loadRegistry?: () => PluginRegistry;
  runWizard?: (registry: PluginRegistry) => Promise<InitSelection>;
  installPackages?: (options: InstallPackagesOptions) => ReturnType<typeof installPackages>;
  buildRuntimeConfig?: (selection: InitSelection) => Promise<ElogConfig>;
  runRuntime?: (config: ElogConfig) => Promise<WorkflowResult[]>;
  reportResults?: (results: WorkflowResult[]) => void;
  throwOnFailed?: (results: WorkflowResult[]) => void;
}

export function selectedPackages(selection: InitSelection): string[] {
  const allPlugins = [selection.from, ...selection.transforms, ...selection.to];
  const seen = new Set<string>();
  return allPlugins
    .map((plugin) => plugin.entry.packageName)
    .filter((name) => {
      if (seen.has(name)) {
        return false;
      }
      seen.add(name);
      return true;
    });
}

export async function runExportCommand(options: RunExportCommandOptions): Promise<void> {
  const loadRegistry = options.loadRegistry ?? loadBuiltInPluginRegistry;
  const runWizard = options.runWizard ?? runExportWizard;
  const doInstall = options.installPackages ?? installPackages;
  const doBuildRuntimeConfig = options.buildRuntimeConfig ?? buildExportRuntimeConfig;
  const runRuntime = options.runRuntime ?? elog;
  const reportResults = options.reportResults ?? reportWorkflowResults;
  const throwOnFailed = options.throwOnFailed ?? throwOnFailedWorkflow;

  const registry = loadRegistry();
  const selection = await runWizard(registry);
  const packages = selectedPackages(selection);
  const packageManager = detectPackageManager(options.cwd);

  doInstall({ cwd: options.cwd, packageManager, packages });

  const runtimeConfig = await doBuildRuntimeConfig(selection);
  const results = await runRuntime(runtimeConfig);
  reportResults(results);
  throwOnFailed(results);
}
