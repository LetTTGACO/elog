import { defineConfig } from '@elogx-test/elog';
import fromYuque from '@elogx-test/plugin-from-yuque';
import toLocal from '@elogx-test/plugin-to-local';
import imageLocal from '@elogx-test/plugin-image-local';

export default defineConfig([
  {
    from: fromYuque({
      pwd: {
        username: process.env.YUQUE_USERNAME,
        password: process.env.YUQUE_PWD,
        login: process.env.YUQUE_LOGIN,
        repo: process.env.YUQUE_REPO,
        onlyPublic: false,
        linebreak: false,
        cacheFilePath: 'elog.cache1.json',
      },
    }),
    to: [
      toLocal({
        outputDir: './docs1',
        deployByStructure: true,
        filename: 'title',
        frontMatter: { enable: true },
      }),
    ],
    plugins: [
      imageLocal({
        outputDir: './images1',
        // prefixKey: '../../images',
        pathFollowDoc: { enable: true, docOutputDir: './docs1' },
      }),
    ],
  },
  {
    from: fromYuque({
      pwd: {
        username: process.env.YUQUE_USERNAME,
        password: process.env.YUQUE_PWD,
        login: process.env.YUQUE_LOGIN,
        repo: process.env.YUQUE_REPO,
        onlyPublic: false,
        linebreak: false,
        cacheFilePath: 'elog.cache2.json',
      },
    }),
    to: [
      toLocal({
        outputDir: './docs2',
        deployByStructure: true,
        filename: 'title',
        frontMatter: { enable: true },
      }),
    ],
    plugins: [
      imageLocal({
        outputDir: './images2',
        // prefixKey: '../../images',
        pathFollowDoc: { enable: true, docOutputDir: './docs2' },
      }),
    ],
  },
]);