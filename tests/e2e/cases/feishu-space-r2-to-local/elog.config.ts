import { defineConfig } from '@elog/cli';
import fromFeishuSpace from '@elog/plugin-from-feishu-space';
import imageR2 from '@elog/plugin-transform-image-r2';
import toLocal from '@elog/plugin-to-local';

export const e2eProfile = {
  id: 'feishu-space-r2-to-local',
  cacheFile: 'elog.cache.json',
  docOutputDir: 'docs',
  imagePrefixKey: 'elog-e2e/feishu-space/',
};

export default defineConfig({
  id: e2eProfile.id,
  cacheFilePath: e2eProfile.cacheFile,
  from: fromFeishuSpace({
    appId: process.env.ELOG_E2E_FEISHU_APP_ID,
    appSecret: process.env.ELOG_E2E_FEISHU_APP_SECRET,
    folderToken: process.env.ELOG_E2E_FEISHU_SPACE_FOLDER_TOKEN,
    baseUrl: process.env.ELOG_E2E_FEISHU_BASE_URL,
  }),
  plugins: [
    imageR2({
      host: process.env.ELOG_E2E_R2_HOST,
      accessKeyId: process.env.ELOG_E2E_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.ELOG_E2E_R2_SECRET_ACCESS_KEY,
      bucket: process.env.ELOG_E2E_R2_BUCKET,
      endpoint: process.env.ELOG_E2E_R2_ENDPOINT,
      region: process.env.ELOG_E2E_R2_REGION,
      prefixKey: e2eProfile.imagePrefixKey,
    }),
  ],
  to: toLocal({
    outputDir: e2eProfile.docOutputDir,
    filename: 'title',
    frontMatter: { enable: true },
  }),
});
