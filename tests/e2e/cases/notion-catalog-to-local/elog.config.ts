import { defineConfig } from '@elog/cli';
import fromNotion from '@elog/plugin-from-notion';
import imageLocal from '@elog/plugin-transform-image-local';
import toLocal from '@elog/plugin-to-local';

type E2eImageProfile = {
  kind: 'local';
  outputDir: string;
  pathFollowDoc: {
    enable: boolean;
    docOutputDir: string;
  };
  expectFiles?: boolean;
};

const docOutputDir = 'docs';

export const e2eProfile: {
  id: string;
  cacheFile: string;
  docOutputDir: string;
  catalogProperty: string;
  image: E2eImageProfile;
} = {
  id: 'notion-catalog-to-local',
  cacheFile: 'elog.cache.json',
  docOutputDir,
  catalogProperty: 'catalog',
  image: {
    kind: 'local',
    outputDir: 'images',
    pathFollowDoc: {
      enable: true,
      docOutputDir,
    },
    expectFiles: true,
  },
};

export default defineConfig({
  id: e2eProfile.id,
  cacheFilePath: e2eProfile.cacheFile,
  from: fromNotion({
    token: process.env.ELOG_E2E_NOTION_TOKEN,
    databaseId: process.env.ELOG_E2E_NOTION_CATALOG_DATABASE_ID,
    catalog: {
      enable: true,
      property: e2eProfile.catalogProperty,
    },
  }),
  plugins: [
    imageLocal({
      outputDir: e2eProfile.image.outputDir,
      pathFollowDoc: e2eProfile.image.pathFollowDoc,
      propertyImageFields: ['cover'],
    }),
  ],
  to: toLocal({
    outputDir: e2eProfile.docOutputDir,
    filename: 'title',
    keepToc: true,
    frontMatter: { enable: true },
  }),
});
