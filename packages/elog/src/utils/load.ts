import path from 'path';
import JoyCon from 'joycon';
import { bundleRequire } from 'bundle-require';
import { defineConfig } from './elog';
import { ElogConfig } from '../types/common';

export async function loadConfigFromFile(
  cwd: string,
  configFile?: string,
): Promise<{ path?: string; data?: ReturnType<typeof defineConfig> }> {
  const configJoycon = new JoyCon();
  const configPath = await configJoycon.resolve({
    files: configFile
      ? [configFile]
      : ['elog.config.ts', 'elog.config.js', 'elog.config.cjs', 'elog.config.mjs'],
    cwd,
    stopDir: path.parse(cwd).root,
    packageKey: 'elog',
  });

  if (configPath) {
    const config = await bundleRequire({
      filepath: configPath,
    });

    let data: ElogConfig | ElogConfig[] = config.mod.default || config.mod;
    if (Array.isArray(data)) {
      if (data.length > 1) {
        data = data.map((item, index) => {
          return {
            ...item,
            cacheFilePath: item.cacheFilePath || `elog.cache${index + 1}.json`,
          };
        });
      } else {
        data = data.map((item) => {
          return {
            ...item,
            cacheFilePath: item.cacheFilePath || 'elog.cache.json',
          };
        });
      }
    } else {
      data = {
        ...data,
        cacheFilePath: data.cacheFilePath || 'elog.cache.json',
      };
    }
    return {
      path: configPath,
      data,
    };
  }

  return {};
}
