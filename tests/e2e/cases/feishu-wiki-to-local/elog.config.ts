import { defineConfig } from '@elog/core';
import fromFeishuWiki from '@elog/plugin-from-feishu-wiki';
import imageLocal from '@elog/plugin-transform-image-local';
import toLocal from '@elog/plugin-to-local';

export type E2eImageProfile = {
  kind: 'local';
  outputDir: string;
  prefixKey: string;
  expectFiles?: boolean;
};

export const e2eProfile: {
  id: string;
  cacheFile: string;
  docOutputDir: string;
  image: E2eImageProfile;
} = {
  id: 'feishu-wiki-to-local',
  cacheFile: 'elog.cache.json',
  docOutputDir: 'docs',
  image: {
    kind: 'local',
    outputDir: 'images',
    prefixKey: '../images',
    expectFiles: true,
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
    imageLocal({
      outputDir: e2eProfile.image.outputDir,
      prefixKey: e2eProfile.image.prefixKey,
    }),
  ],
  to: toLocal({
    outputDir: e2eProfile.docOutputDir,
    frontMatter: { enable: true },
    keepToc: true,
  }),
});
