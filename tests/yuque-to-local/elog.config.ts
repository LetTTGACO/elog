import { defineConfig } from '@elog/cli';
import fromYuque from '@elog/plugin-from-yuque-pwd';
import imageLocal from '@elog/plugin-image-local';
import toLocal from '@elog/plugin-to-local';

export default defineConfig({
  id: 'yuque-to-local',
  cacheFilePath: 'elog.cache.json',
  from: fromYuque({
    username: process.env.YUQUE_USERNAME,
    password: process.env.YUQUE_PWD,
    login: process.env.YUQUE_LOGIN,
    repo: process.env.YUQUE_REPO,
    onlyPublic: false,
    onlyPublished: true,
  }),
  plugins: [
    imageLocal({
      outputDir: './source/images',
      prefixKey: './images',
      propertyImageFields: ['cover'],
    }),
  ],
  to: toLocal({
    outputDir: './source/_posts',
    filename: 'title',
    keepToc: true,
    frontMatter: { enable: true },
  }),
});
