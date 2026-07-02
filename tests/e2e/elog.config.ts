import { defineConfig } from '@elog/cli';
import fromYuque from '@elog/plugin-from-yuque-pwd';
import imageLocal from '@elog/plugin-transform-image-local';
import toLocal from '@elog/plugin-to-local';

export default defineConfig({
  from: fromYuque({
    username: process.env.YUQUE_USERNAME,
    password: process.env.YUQUE_PWD,
    login: process.env.YUQUE_LOGIN,
    repo: process.env.YUQUE_REPO,
    linebreak: false,
  }),
  plugins: [
    imageLocal({
      outputDir: '.tmp/images',
      prefixKey: '../../images',
    }),
  ],
  to: toLocal({
    outputDir: '.tmp/docs',
    keepToc: true,
  }),
});
