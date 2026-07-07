import { ElogPluginError } from '../plugins/errors';
import type {
  DownloadResult,
  FromPlugin,
  PluginContext,
  ToPlugin,
  TransformPlugin,
} from '../plugins/types';
import type { DocDetail } from '../types/doc';

/** 插件驱动入参明确拆分三类插件，避免运行时再推断生命周期。 */
export interface PluginDriverOptions {
  from: FromPlugin;
  transforms: TransformPlugin[];
  to: ToPlugin[];
}

/** 统一执行插件生命周期，并为每个 hook 包装可定位的插件错误。 */
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

  /** 下载阶段只允许一个来源插件执行，失败时标记 download hook。 */
  async runDownloadHook(): Promise<DownloadResult> {
    try {
      return await this.from.download(this.ctx);
    } catch (error) {
      throw new ElogPluginError(this.from.name, 'download', error);
    }
  }

  /** 转换插件按声明顺序串行处理，后一个插件接收前一个插件的输出。 */
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

  /** 部署阶段可串行或并行执行，策略由工作流配置显式决定。 */
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

  /** 给每个部署插件提供浅拷贝文档，降低多目标部署时互相污染的风险。 */
  private async runDeployHook(plugin: ToPlugin, docDetailList: DocDetail[]) {
    try {
      const docsForDeploy = docDetailList.map((doc) => ({ ...doc }));
      await plugin.deploy(docsForDeploy, this.ctx);
    } catch (error) {
      throw new ElogPluginError(plugin.name, 'deploy', error);
    }
  }
}
