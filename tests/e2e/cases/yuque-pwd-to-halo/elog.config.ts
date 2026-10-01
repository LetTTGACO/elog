import { defineConfig } from '@elog/cli';
import fromYuque from '@elog/plugin-from-yuque-pwd';
import imageR2 from '@elog/plugin-transform-image-r2';
import markdownToHtml from '@elog/plugin-transform-markdown-to-html';
import toHalo from '@elog/plugin-to-halo';

export const e2eProfile = {
  id: 'yuque-pwd-to-halo',
  cacheFile: 'elog.cache.json',
  image: {
    kind: 'r2' as const,
    prefixKey: 'elog-e2e/yuque-pwd/',
  },
};

export default defineConfig({
  id: e2eProfile.id,
  cacheFilePath: e2eProfile.cacheFile,
  from: fromYuque({
    username: process.env.ELOG_E2E_YUQUE_USERNAME,
    password: process.env.ELOG_E2E_YUQUE_PWD,
    login: process.env.ELOG_E2E_YUQUE_LOGIN,
    repo: process.env.ELOG_E2E_YUQUE_REPO_TOC,
  }),
  plugins: [
    imageR2({
      host: process.env.ELOG_E2E_R2_HOST!,
      accessKeyId: process.env.ELOG_E2E_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.ELOG_E2E_R2_SECRET_ACCESS_KEY!,
      bucket: process.env.ELOG_E2E_R2_BUCKET!,
      endpoint: process.env.ELOG_E2E_R2_ENDPOINT!,
      region: process.env.ELOG_E2E_R2_REGION,
      prefixKey: e2eProfile.image.prefixKey,
      propertyImageFields: ['cover'],
    }),
  ],
  to: toHalo({
    endpoint: process.env.ELOG_E2E_HALO_ENDPOINT!,
    token: process.env.ELOG_E2E_HALO_TOKEN!,
    plugins: [markdownToHtml()],
  }),
});
