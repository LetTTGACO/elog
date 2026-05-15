import path from 'path';
import JoyCon from 'joycon';
import { bundleRequire } from 'bundle-require';
import type { RawUserConfig } from '../types/common';

export async function loadConfigFromFile(
  cwd: string,
  configFile?: string,
): Promise<{ path?: string; data?: RawUserConfig }> {
  const configJoycon = new JoyCon();
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
    data: config.mod.default || config.mod,
  };
}
