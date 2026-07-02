import { defineConfig } from '@elog/cli';
import yuqueToken from '@elog/plugin-from-yuque-token';
import imageLocal from '@elog/plugin-image-local';
import toLocal from '@elog/plugin-to-local';

export default defineConfig({
  id: 'yuque-token-image-local-to-local',
  cacheFilePath: 'elog.cache.json',
  from: yuqueToken({
    token: process.env.ELOG_E2E_YUQUE_TOKEN,
    login: process.env.ELOG_E2E_YUQUE_LOGIN,
    repo: process.env.ELOG_E2E_YUQUE_REPO,
    onlyPublic: false,
  }),
  plugins: [
    imageLocal({
      outputDir: './images',
      prefixKey: '../images',
    }),
  ],
  to: toLocal({
    outputDir: './docs',
    keepToc: true,
    filename: 'title',
    frontMatter: { enable: true },
  }),
});
