import { ElogPluginError } from '../plugins/errors';
import type {
  DownloadResult,
  FromPlugin,
  PluginContext,
  ToPlugin,
  TransformPlugin,
} from '../plugins/types';
import type { DocDetail } from '../types/doc';

export interface PluginDriverOptions {
  from: FromPlugin;
  transforms: TransformPlugin[];
  to: ToPlugin[];
}

export class PluginDriver {
  readonly from: FromPlugin;
  readonly transforms: TransformPlugin[];
  readonly to: ToPlugin[];
  private readonly ctx: PluginContext;

  constructor(options: PluginDriverOptions, ctx: PluginContext) {
    this.from = options.from;
    this.transforms = options.transforms;
    this.to = options.to;
    this.ctx = ctx;
  }

  async runDownloadHook(): Promise<DownloadResult> {
    try {
      return await this.from.download(this.ctx);
    } catch (error) {
      throw new ElogPluginError(this.from.name, 'download', error);
    }
  }

  async runTransformPipeline(docDetailList: DocDetail[]): Promise<DocDetail[]> {
    let output = docDetailList;

    for (const plugin of this.transforms) {
      try {
        output = await plugin.transform(output, this.ctx);
      } catch (error) {
        throw new ElogPluginError(plugin.name, 'transform', error);
      }
    }

    return output;
  }

  async runDeployHooks(
    docDetailList: DocDetail[],
    deployStrategy: 'serial' | 'parallel',
  ): Promise<void> {
    if (deployStrategy === 'parallel') {
      await Promise.all(this.to.map((plugin) => this.runDeployHook(plugin, docDetailList)));
      return;
    }

    for (const plugin of this.to) {
      await this.runDeployHook(plugin, docDetailList);
    }
  }

  private async runDeployHook(plugin: ToPlugin, docDetailList: DocDetail[]) {
    try {
      const docsForDeploy = docDetailList.map((doc) => ({ ...doc }));
      await plugin.deploy(docsForDeploy, this.ctx);
    } catch (error) {
      throw new ElogPluginError(plugin.name, 'deploy', error);
    }
  }
}
