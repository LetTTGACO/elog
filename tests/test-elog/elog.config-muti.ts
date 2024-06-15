import { defineConfig } from '@elogx-test/elog';
import fromYuque from '@elogx-test/plugin-from-yuque-pwd';
import fromYuqueToken from '@elogx-test/plugin-from-yuque-token';
import toLocal from '@elogx-test/plugin-to-local';
import imageLocal from '@elogx-test/plugin-image-local';

export default defineConfig([
  {
    from: fromYuqueToken({
      token: process.env.YUQUE_TOKEN,
      login: process.env.YUQUE_LOGIN,
      repo: process.env.YUQUE_REPO1,
      onlyPublic: false,
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
    from: fromYuqueToken({
      token: process.env.YUQUE_TOKEN,
      login: process.env.YUQUE_LOGIN,
      repo: process.env.YUQUE_REPO1,
      onlyPublic: false,
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
        pathFollowDoc: { enable: true, docOutputDir: './docs1' },
      }),
    ],
  },
  {
    from: fromYuqueToken({
      token: process.env.YUQUE_TOKEN,
      login: process.env.YUQUE_LOGIN,
      repo: process.env.YUQUE_REPO1,
      onlyPublic: false,
    }),
    to: [
      toLocal({
        outputDir: './docs3',
        deployByStructure: true,
        filename: 'title',
        frontMatter: { enable: true },
      }),
    ],
    plugins: [
      imageLocal({
        outputDir: './images3',
        // prefixKey: '../../images',
        pathFollowDoc: { enable: true, docOutputDir: './docs1' },
      }),
    ],
  },
  {
    from: fromYuqueToken({
      token: process.env.YUQUE_TOKEN,
      login: process.env.YUQUE_LOGIN,
      repo: process.env.YUQUE_REPO1,
      onlyPublic: false,
    }),
    to: [
      toLocal({
        outputDir: './docs4',
        deployByStructure: true,
        filename: 'title',
        frontMatter: { enable: true },
      }),
    ],
    plugins: [
      imageLocal({
        outputDir: './images4',
        // prefixKey: '../../images',
        pathFollowDoc: { enable: true, docOutputDir: './docs1' },
      }),
    ],
  },
  {
    from: fromYuque({
      username: process.env.YUQUE_USERNAME,
      password: process.env.YUQUE_PWD,
      login: process.env.YUQUE_LOGIN,
      repo: process.env.YUQUE_REPO2,
      onlyPublic: false,
      linebreak: false,
    }),
    to: [
      toLocal({
        outputDir: './docs5',
        deployByStructure: true,
        filename: 'title',
        frontMatter: { enable: true },
      }),
    ],
    plugins: [
      imageLocal({
        outputDir: './images5',
        // prefixKey: '../../images',
        pathFollowDoc: { enable: true, docOutputDir: './docs2' },
      }),
    ],
  },
]);
