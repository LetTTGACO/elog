import { readFileSync } from 'node:fs';

// 发布会在构建后更新 package.json，版本号必须从安装包运行时读取。
const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { version: string };

export const cliVersion = packageJson.version;
