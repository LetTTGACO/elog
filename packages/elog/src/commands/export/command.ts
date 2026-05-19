import elog from '../../node-entry';
import type { ElogConfig } from '../../types/common';
import type { WorkflowResult } from '../../runtime/types';
import { detectPackageManager, installPackages } from '../init/package-manager';
import type { InstallPackagesOptions } from '../init/package-manager';
import { loadBuiltInPluginRegistry } from '../init/registry';
import type { ExportSelection, PluginRegistry } from '../init/types';
import { runExportWizard } from '../init/wizard';
import { reportWorkflowResults, throwOnFailedWorkflow } from '../sync/results';
import { buildExportRuntimeConfig } from './runtime-config';
import type { BuildExportRuntimeConfigOptions } from './runtime-config';

/** export 命令依赖注入边界，测试可替换安装、向导、运行时和结果处理。 */
export interface RunExportCommandOptions {
  cwd: string;
  loadRegistry?: () => PluginRegistry;
  runWizard?: (registry: PluginRegistry) => Promise<ExportSelection>;
  installPackages?: (options: InstallPackagesOptions) => ReturnType<typeof installPackages>;
  buildRuntimeConfig?: (
    selection: ExportSelection,
    options: BuildExportRuntimeConfigOptions,
  ) => Promise<ElogConfig>;
  runRuntime?: (config: ElogConfig) => Promise<WorkflowResult[]>;
  reportResults?: (results: WorkflowResult[]) => void;
  throwOnFailed?: (results: WorkflowResult[]) => void;
}

/** 从 export 选择结果中收集需要安装的插件包，并按包名去重。 */
export function selectedPackages(selection: ExportSelection): string[] {
  const allPlugins = [selection.from, ...selection.transforms, selection.to];
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

/** 执行一次性导出：安装所选插件、构造临时运行时配置并立即同步。 */
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

  const runtimeConfig = await doBuildRuntimeConfig(selection, { cwd: options.cwd });
  const results = await runRuntime(runtimeConfig);
  reportResults(results);
  throwOnFailed(results);
}
