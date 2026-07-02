import { defineConfig } from '@elog/cli';
import fromYuque from '@elog/plugin-from-yuque-pwd';
// import fromYuqueToken from '@elog/plugin-from-yuque-token';
import toLocal from '@elog/plugin-to-local';
import imageLocal from '@elog/plugin-image-local';

const docOutputDir = './docs/yuque-local1';

export default defineConfig([
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
        outputDir: docOutputDir,
        keepToc: true,
        filename: 'title',
        frontMatter: { enable: true },
      }),
    ],
    plugins: [
      imageLocal({
        outputDir: './images/images1',
        // prefixKey: '../../images',
        pathFollowDoc: { enable: true, docOutputDir: docOutputDir },
      }),
    ],
    disableCache: true,
  },
  // {
  //   from: fromYuqueToken({
  //     token: process.env.YUQUE_TOKEN,
  //     login: process.env.YUQUE_LOGIN,
  //     repo: process.env.YUQUE_REPO1,
  //     onlyPublic: false,
  //   }),
  //   to: [
  //     toLocal({
  //       outputDir: './docs2',
  //       keepToc: true,
  //       filename: 'title',
  //       frontMatter: { enable: true },
  //     }),
  //   ],
  //   plugins: [
  //     imageLocal({
  //       outputDir: './images2',
  //       // prefixKey: '../../images',
  //       pathFollowDoc: { enable: true, docOutputDir: './docs1' },
  //     }),
  //   ],
  // },
  // {
  //   from: fromYuqueToken({
  //     token: process.env.YUQUE_TOKEN,
  //     login: process.env.YUQUE_LOGIN,
  //     repo: process.env.YUQUE_REPO1,
  //     onlyPublic: false,
  //   }),
  //   to: [
  //     toLocal({
  //       outputDir: './docs3',
  //       keepToc: true,
  //       filename: 'title',
  //       frontMatter: { enable: true },
  //     }),
  //   ],
  //   plugins: [
  //     imageLocal({
  //       outputDir: './images3',
  //       // prefixKey: '../../images',
  //       pathFollowDoc: { enable: true, docOutputDir: './docs1' },
  //     }),
  //   ],
  // },
  // {
  //   from: fromYuqueToken({
  //     token: process.env.YUQUE_TOKEN,
  //     login: process.env.YUQUE_LOGIN,
  //     repo: process.env.YUQUE_REPO1,
  //     onlyPublic: false,
  //   }),
  //   to: [
  //     toLocal({
  //       outputDir: './docs4',
  //       keepToc: true,
  //       filename: 'title',
  //       frontMatter: { enable: true },
  //     }),
  //   ],
  //   plugins: [
  //     imageLocal({
  //       outputDir: './images4',
  //       // prefixKey: '../../images',
  //       pathFollowDoc: { enable: true, docOutputDir: './docs1' },
  //     }),
  //   ],
  // },
  // {
  //   from: fromYuque({
  //     username: process.env.YUQUE_USERNAME,
  //     password: process.env.YUQUE_PWD,
  //     login: process.env.YUQUE_LOGIN,
  //     repo: process.env.YUQUE_REPO2,
  //     onlyPublic: false,
  //     linebreak: false,
  //   }),
  //   to: [
  //     toLocal({
  //       outputDir: './docs5',
  //       keepToc: true,
  //       filename: 'title',
  //       frontMatter: { enable: true },
  //     }),
  //   ],
  //   plugins: [
  //     imageLocal({
  //       outputDir: './images5',
  //       // prefixKey: '../../images',
  //       pathFollowDoc: { enable: true, docOutputDir: './docs2' },
  //     }),
  //   ],
  // },
]);
