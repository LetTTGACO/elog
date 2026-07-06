import { defineConfig } from '@elog/cli';
import fromNotion from '@elog/plugin-from-notion';
import imageR2 from '@elog/plugin-transform-image-r2';
import markdownToHtml from '@elog/plugin-transform-markdown-to-html';
import toWordPress from '@elog/plugin-to-wordpress';

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
  id: 'notion-to-wordpress',
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
  to: toWordPress({
    endpoint: process.env.ELOG_E2E_WORDPRESS_ENDPOINT!,
    username: process.env.ELOG_E2E_WORDPRESS_USERNAME!,
    password: process.env.ELOG_E2E_WORDPRESS_PASSWORD!,
  }),
});
