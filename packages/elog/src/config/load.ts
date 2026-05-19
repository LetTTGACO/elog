import path from 'path';
import JoyCon from 'joycon';
import { bundleRequire } from 'bundle-require';
import type { RawUserConfig } from '../types/common';

/** 从指定目录发现并加载 Elog 配置文件，支持 TS/JS/CJS/MJS 入口。 */
export async function loadConfigFromFile(
  cwd: string,
  configFile?: string,
): Promise<{ path?: string; data?: RawUserConfig }> {
  const configJoycon = new JoyCon();
  // JoyCon 负责向上查找配置；stopDir 限制到当前磁盘根目录避免无限查找。
  const configPath = await configJoycon.resolve({
    files: configFile
      ? [configFile]
      : ['elog.config.ts', 'elog.config.js', 'elog.config.cjs', 'elog.config.mjs'],
    cwd,
    stopDir: path.parse(cwd).root,
    packageKey: 'elog',
  });

  if (!configPath) {
    return {};
  }

  const config = await bundleRequire({ filepath: configPath });

  return {
    path: configPath,
    // 兼容 default export 和 CommonJS 直接导出两种用户配置写法。
    data: config.mod.default || config.mod,
  };
}
