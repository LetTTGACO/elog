import { defineConfig, type TransformPlugin } from '@elog/cli';
import fromFlowUs from '@elog/plugin-from-flowus';
import imageLocal from '@elog/plugin-transform-image-local';
import imageR2 from '@elog/plugin-transform-image-r2';
import toLocal from '@elog/plugin-to-local';

type E2eImageProfile =
  | {
      kind: 'local';
      outputDir: string;
      prefixKey: string;
      expectFiles?: boolean;
    }
  | {
      kind: 'r2';
      prefixKey: string;
      expectFiles?: false;
    };

const env = process.env;
const docOutputDir = 'docs';
const imageProfiles: Record<E2eImageProfile['kind'], E2eImageProfile> = {
  local: {
    kind: 'local',
    outputDir: 'images',
    prefixKey: '../images',
    expectFiles: true,
  },
  r2: {
    kind: 'r2',
    prefixKey: 'elog-e2e/flowus/',
  },
};

const imageKind = env.ELOG_E2E_FLOWUS_IMAGE === 'r2' ? 'r2' : 'local';

function createImagePlugins(image: E2eImageProfile): TransformPlugin[] {
  if (image.kind === 'local') {
    return [
      imageLocal({
        outputDir: image.outputDir,
        prefixKey: image.prefixKey,
        propertyImageFields: ['cover'],
      }),
    ];
  }

  return [
    imageR2({
      host: env.ELOG_E2E_R2_HOST,
      accessKeyId: env.ELOG_E2E_R2_ACCESS_KEY_ID,
      secretAccessKey: env.ELOG_E2E_R2_SECRET_ACCESS_KEY,
      bucket: env.ELOG_E2E_R2_BUCKET,
      endpoint: env.ELOG_E2E_R2_ENDPOINT,
      region: env.ELOG_E2E_R2_REGION,
      prefixKey: image.prefixKey,
      propertyImageFields: ['cover'],
    }),
  ];
}

export const e2eProfile: {
  id: string;
  cacheFile: string;
  docOutputDir: string;
  image: E2eImageProfile;
} = {
  id: 'flowus-to-local',
  cacheFile: 'elog.cache.json',
  docOutputDir,
  image: imageProfiles[imageKind],
};

export default defineConfig({
  id: e2eProfile.id,
  cacheFilePath: e2eProfile.cacheFile,
  from: fromFlowUs({
    tablePageId: env.ELOG_E2E_FLOWUS_TABLE_PAGE_ID,
    filter: false,
    sort: false,
    catalog: false,
  }),
  plugins: createImagePlugins(e2eProfile.image),
  to: toLocal({
    outputDir: e2eProfile.docOutputDir,
    filename: 'title',
    frontMatter: { enable: true },
  }),
});
