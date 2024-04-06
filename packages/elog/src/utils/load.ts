import path from 'path';
import JoyCon from 'joycon';
import { bundleRequire } from 'bundle-require';
import { defineConfig } from './elog';

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
    return {
      path: configPath,
      data: config.mod.default || config.mod,
    };
  }

  return {};
}
