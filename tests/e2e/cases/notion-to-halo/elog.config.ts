import { defineConfig } from '@elog/cli';
import fromNotion from '@elog/plugin-from-notion';
import imageR2 from '@elog/plugin-transform-image-r2';
import markdownToHtml from '@elog/plugin-transform-markdown-to-html';
import toHalo from '@elog/plugin-to-halo';

export type E2eImageProfile = {
  kind: 'r2';
  prefixKey: string;
  expectFiles?: false;
};

export const e2eProfile: {
  id: string;
  cacheFile: string;
  image: E2eImageProfile;
} = {
  id: 'notion-to-halo',
  cacheFile: 'elog.cache.json',
  image: {
    kind: 'r2',
    prefixKey: 'elog-e2e/notion/',
  },
};

export default defineConfig({
  id: e2eProfile.id,
  cacheFilePath: e2eProfile.cacheFile,
  from: fromNotion({
    token: process.env.ELOG_E2E_NOTION_TOKEN,
    databaseId: process.env.ELOG_E2E_NOTION_DATABASE_ID,
    catalog: false,
  }),
  plugins: [
    imageR2({
      host: process.env.ELOG_E2E_R2_HOST!,
      accessKeyId: process.env.ELOG_E2E_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.ELOG_E2E_R2_SECRET_ACCESS_KEY!,
      bucket: process.env.ELOG_E2E_R2_BUCKET!,
      endpoint: process.env.ELOG_E2E_R2_ENDPOINT!,
      prefixKey: e2eProfile.image.prefixKey,
    }),
    markdownToHtml(),
  ],
  to: toHalo({
    endpoint: process.env.ELOG_E2E_HALO_ENDPOINT!,
    token: process.env.ELOG_E2E_HALO_TOKEN!,
    enableUploadImage: false,
  }),
});
