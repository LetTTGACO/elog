import { defineConfig } from '@elog/cli';
import fromYuque from '@elog/plugin-from-yuque-token';
import toLocal from '@elog/plugin-to-local';
import imageLocal from '@elog/plugin-transform-image-local';

export default defineConfig({
  from: fromYuque({
    token: process.env.YUQUE_TOKEN,
    login: process.env.YUQUE_LOGIN,
    repo: process.env.YUQUE_REPO1,
    onlyPublic: false,
  }),
  plugins: [
    imageLocal({
      outputDir: './images',
      prefixKey: '../../images',
      // pathFollowDoc: { enable: true, docOutputDir: './docs' },
    }),
  ],
  to: [
    toLocal({
      outputDir: './docs',
      keepToc: true,
      filename: 'title',
      frontMatter: { enable: true },
    }),
    toLocal({
      outputDir: './docs-new',
      keepToc: true,
      filename: 'title',
      frontMatter: { enable: true },
    }),
  ],
});
