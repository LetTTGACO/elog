import { defineConfig } from '@elogx-test/elog';
import yuqueToken from '@elogx-test/plugin-from-yuque-token';
import imageLocal from '@elogx-test/plugin-image-local';
import toLocal from '@elogx-test/plugin-to-local';

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
