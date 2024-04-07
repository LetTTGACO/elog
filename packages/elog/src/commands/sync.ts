import path from 'path';
import dotenv from 'dotenv';
import { findConfig } from '../utils/find-config';
import elog from '../node-entry';
import out from '../utils/logger';

/**
 * 同步
 * @param customConfigPath
 * @param envPath
 * @param enableDebug DEBUG 模式
 */
const sync = async (customConfigPath?: string, envPath?: string, enableDebug?: boolean) => {
  // 是否开始 DEBUG 模式
  if (enableDebug) {
    process.env.DEBUG = 'true';
  }
  const rootDir = process.cwd();
  // 加载环境变量
  if (envPath) {
    // 本地模式
    envPath = path.resolve(rootDir, envPath);
    out.info('环境变量', `已指定读取env文件为：${envPath}`);
    dotenv.config({ override: true, path: envPath });
  } else {
    // 生产模式
    out.info('环境变量', `未指定env文件，将从系统环境变量中读取`);
  }
  // 加载配置文件
  const userConfig = await findConfig(customConfigPath);
  await elog(userConfig!);
};

export default sync;
