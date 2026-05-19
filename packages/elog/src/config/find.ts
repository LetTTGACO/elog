import { loadConfigFromFile } from '../config/load';
import out from '../logging/logger';

/** CLI 层查找配置的薄封装，找不到配置时沿用终端 fatal 输出。 */
export const findConfig = async (customConfigPath?: string) => {
  const config = await loadConfigFromFile(process.cwd(), customConfigPath);
  const configData = config.data;
  if (!configData) {
    out.error('未找到 Elog 配置文件');
  }
  return configData;
};
