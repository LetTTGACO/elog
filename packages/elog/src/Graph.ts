import { PluginDriver } from './utils/PluginDriver';
import { NormalizeElogOption } from './types/common';

export default class Graph {
  readonly pluginDriver: PluginDriver;

  constructor(options: NormalizeElogOption) {
    this.pluginDriver = new PluginDriver(this, options.plugins, options);
  }

  /**
   * 开始同步
   */
  async sync(): Promise<void> {
    // 执行插件的start钩子
    await this.pluginDriver.executeVoidHooks('start', []);
    // 从写作平台下载文档
    let docList = await this.pluginDriver.executeFromPluginHook('down', []);
    // 执行插件的transform钩子，处理文档详情
    docList = await this.pluginDriver.executeChainHooks('transform', [docList]);
    // 执行插件的upload钩子，上传文档到目标平台
    await this.pluginDriver.executeVoidHooks('deploy', [docList]);
    // 执行插件的end钩子
    await this.pluginDriver.executeVoidHooks('end', []);
  }
}
