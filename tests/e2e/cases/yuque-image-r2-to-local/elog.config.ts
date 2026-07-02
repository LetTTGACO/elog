import { defineConfig } from '@elogx-test/elog';
import fromYuque from '@elogx-test/plugin-from-yuque-pwd';
import imageR2 from '@elogx-test/plugin-image-r2';
import toLocal from '@elogx-test/plugin-to-local';

export default defineConfig({
  id: 'yuque-image-r2-to-local',
  cacheFilePath: 'elog.cache.json',
  from: fromYuque({
    username: process.env.ELOG_E2E_YUQUE_USERNAME,
    password: process.env.ELOG_E2E_YUQUE_PWD,
    login: process.env.ELOG_E2E_YUQUE_LOGIN,
    repo: process.env.ELOG_E2E_YUQUE_REPO,
    onlyPublic: false,
  }),
  plugins: [
    imageR2({
      host: process.env.ELOG_E2E_R2_HOST!,
      accessKeyId: process.env.ELOG_E2E_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.ELOG_E2E_R2_SECRET_ACCESS_KEY!,
      bucket: process.env.ELOG_E2E_R2_BUCKET!,
      endpoint: process.env.ELOG_E2E_R2_ENDPOINT!,
    }),
  ],
  to: toLocal({
    outputDir: './docs',
    keepToc: true,
    filename: 'title',
    frontMatter: { enable: true },
  }),
});
