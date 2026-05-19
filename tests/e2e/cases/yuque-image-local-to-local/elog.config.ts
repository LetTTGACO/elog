import { defineConfig } from '@elogx-test/elog';
import fromYuque from '@elogx-test/plugin-from-yuque-pwd';
import imageLocal from '@elogx-test/plugin-image-local';
import toLocal from '@elogx-test/plugin-to-local';

export default defineConfig({
  id: 'yuque-image-local-to-local',
  cacheFilePath: 'elog.cache.json',
  from: fromYuque({
    username: process.env.ELOG_E2E_YUQUE_USERNAME,
    password: process.env.ELOG_E2E_YUQUE_PWD,
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
