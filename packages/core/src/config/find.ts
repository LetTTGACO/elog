import { loadConfigFromFile } from '../config/load';
import { ElogConfigError } from '../plugins/errors';

/** 查找配置文件；找不到时抛出配置错误，由调用方决定如何展示。 */
export const findConfig = async (customConfigPath?: string) => {
  const config = await loadConfigFromFile(process.cwd(), customConfigPath);
  const configData = config.data;
  if (!configData) {
    throw new ElogConfigError('未找到 Elog 配置文件');
  }
  return configData;
};
