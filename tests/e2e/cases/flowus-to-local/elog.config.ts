import { defineConfig } from '@elog/core';
import type { TransformPlugin } from '@elog/plugin-sdk';
import fromFlowUs from '@elog/plugin-from-flowus';
import imageLocal from '@elog/plugin-transform-image-local';
import imageR2 from '@elog/plugin-transform-image-r2';
import toLocal from '@elog/plugin-to-local';

// FlowUs support is currently paused: the real platform path is member-gated
// and should stay as manual e2e coverage, not a required maintenance surface.
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

type E2eImageKind = E2eImageProfile['kind'];
const env = process.env;
const caseId = 'flowus-to-local';
const docOutputDir = 'docs';
const imageProfiles: Record<E2eImageKind, E2eImageProfile> = {
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

function selectImageProfile(defaultKind: E2eImageKind): E2eImageProfile {
  const imageKind =
    env.ELOG_E2E_CASE && env.ELOG_E2E_CASE !== caseId
      ? defaultKind
      : (env.ELOG_E2E_IMAGE ?? defaultKind);

  if (!(imageKind in imageProfiles)) {
    throw new Error(
      `Unsupported ELOG_E2E_IMAGE "${imageKind}". Expected one of: ${Object.keys(
        imageProfiles,
      ).join(', ')}`,
    );
  }

  return imageProfiles[imageKind as E2eImageKind];
}

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
  id: caseId,
  cacheFile: 'elog.cache.json',
  docOutputDir,
  image: selectImageProfile('r2'),
};

export default defineConfig({
  id: e2eProfile.id,
  cacheFilePath: e2eProfile.cacheFile,
  from: fromFlowUs({
    tablePageId: env.ELOG_E2E_FLOWUS_TABLE_PAGE_ID,
  }),
  plugins: createImagePlugins(e2eProfile.image),
  to: toLocal({
    outputDir: e2eProfile.docOutputDir,
    frontMatter: { enable: true },
  }),
});
