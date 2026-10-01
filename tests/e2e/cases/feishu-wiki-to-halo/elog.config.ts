import { defineConfig } from '@elog/cli';
import fromFeishuWiki from '@elog/plugin-from-feishu-wiki';
import imageR2 from '@elog/plugin-transform-image-r2';
import markdownToHtml from '@elog/plugin-transform-markdown-to-html';
import toHalo from '@elog/plugin-to-halo';

export const e2eProfile = {
  id: 'feishu-wiki-to-halo',
  cacheFile: 'elog.cache.json',
  image: {
    kind: 'r2' as const,
    prefixKey: 'elog-e2e/feishu-wiki/',
  },
};

export default defineConfig({
  id: e2eProfile.id,
  cacheFilePath: e2eProfile.cacheFile,
  from: fromFeishuWiki({
    appId: process.env.ELOG_E2E_FEISHU_APP_ID,
    appSecret: process.env.ELOG_E2E_FEISHU_APP_SECRET,
    wikiId: process.env.ELOG_E2E_FEISHU_WIKI_ID,
    folderToken: process.env.ELOG_E2E_FEISHU_WIKI_FOLDER_TOKEN,
    baseUrl: process.env.ELOG_E2E_FEISHU_BASE_URL,
    disableParentDoc: true,
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
