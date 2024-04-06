import { loadConfigFromFile } from './load';
import out from './logger';

export const findConfig = async (customConfigPath?: string) => {
  const config = await loadConfigFromFile(process.cwd(), customConfigPath);
  const configData = config.data;
  if (!configData) {
    out.error('未找到 Elog 配置文件');
  }
  return configData;
};
