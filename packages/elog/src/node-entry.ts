import { ElogConfig, InputOptions, NormalizeElogOption } from './types/common';
import Graph from './Graph';

export default elog;

/**
 * 入口命令
 * @param rawInputOptions
 */
export async function elog(rawInputOptions: InputOptions): Promise<void> {
  return elogInternal(rawInputOptions);
}

/**
 * 内部执行
 * @param rawInputOptions
 */
export async function elogInternal(rawInputOptions: InputOptions): Promise<void> {
  // 处理输入参数
  const flowList = await getInputOptions(rawInputOptions);
  for (let i = 0; i < flowList.length; i++) {
    const options = flowList[i];
    const graph = new Graph(options);
    try {
      // 初始化流程
      // 开始同步
      await graph.sync();
    } catch (error_: any) {
      throw error_;
    }
  }
}

/**
 * 处理 Elog 配置，将所有配置其转化为插件
 * @param config
 */
async function normalizeElogOptions(config: InputOptions): Promise<NormalizeElogOption[]> {
  let rawElogConfig: ElogConfig[] = [];
  // 判断是否是数组
  if (Array.isArray(config)) {
    // 递归处理
    rawElogConfig = config;
  } else {
    rawElogConfig = [config];
  }

  return rawElogConfig
    .filter((config) => {
      // 过滤不需要同步的流程
      return !config.disable;
    })
    .map((config) => {
      if (!config.from) {
        throw new Error('You must supply an `from` option to elog');
      }
      if (!config.to) {
        throw new Error('You must supply an `to` option to elog');
      }

      if (!config.plugins) {
        config.plugins = [];
      }

      let sortedPlugins = [config.from, ...config.plugins];
      if (Array.isArray(config.to)) {
        sortedPlugins = [...sortedPlugins, ...config.to];
      } else {
        sortedPlugins.push(config.to);
      }
      return {
        plugins: sortedPlugins,
      };
    });
}

/**
 * 获取输入参数
 * @param initialInputOptions
 */
async function getInputOptions(initialInputOptions: InputOptions): Promise<NormalizeElogOption[]> {
  if (!initialInputOptions) {
    throw new Error('You must supply an options to elog');
  }
  const options = await normalizeElogOptions(initialInputOptions);

  return options;
}
