import { defineConfig } from '@elogx-test/elog';
import fromYuque from '@elogx-test/plugin-from-yuque-token';
import toLocal from '@elogx-test/plugin-to-local';
import imageLocal from '@elogx-test/plugin-image-local';

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
