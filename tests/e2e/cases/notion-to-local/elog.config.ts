import { defineConfig } from '@elog/cli';
import fromNotion from '@elog/plugin-from-notion';
import imageLocal from '@elog/plugin-transform-image-local';
import imageR2 from '@elog/plugin-transform-image-r2';
import toLocal from '@elog/plugin-to-local';

type E2eImageProfile =
  | { kind: 'none' }
  | {
      kind: 'local';
      outputDir: string;
      prefixKey: string;
      expectFiles?: boolean;
    }
  | {
      kind: 'r2';
      expectFiles?: false;
    };

export const e2eProfile: {
  id: string;
  cacheFile: string;
  docOutputDir: string;
  image: E2eImageProfile;
} = {
  id: 'notion-to-local',
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
  from: fromNotion({
    token: process.env.ELOG_E2E_NOTION_TOKEN,
    databaseId: process.env.ELOG_E2E_NOTION_DATABASE_ID,
    catalog: false,
  }),
  plugins:
    e2eProfile.image.kind === 'local'
      ? [
          imageLocal({
            outputDir: e2eProfile.image.outputDir,
            prefixKey: e2eProfile.image.prefixKey,
            propertyImageFields: ['cover'],
          }),
        ]
      : e2eProfile.image.kind === 'r2'
        ? [
            imageR2({
              host: process.env.ELOG_E2E_R2_HOST!,
              accessKeyId: process.env.ELOG_E2E_R2_ACCESS_KEY_ID!,
              secretAccessKey: process.env.ELOG_E2E_R2_SECRET_ACCESS_KEY!,
              bucket: process.env.ELOG_E2E_R2_BUCKET!,
              endpoint: process.env.ELOG_E2E_R2_ENDPOINT!,
              prefixKey: 'elog-e2e/notion/',
            }),
          ]
        : [],
  to: toLocal({
    outputDir: e2eProfile.docOutputDir,
    filename: 'title',
    frontMatter: { enable: true },
  }),
});
