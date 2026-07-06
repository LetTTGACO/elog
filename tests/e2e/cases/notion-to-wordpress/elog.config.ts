import { defineConfig, type ElogConfig, type TransformPlugin } from '@elog/cli';
import fromNotion from '@elog/plugin-from-notion';
import imageLocal from '@elog/plugin-transform-image-local';
import imageR2 from '@elog/plugin-transform-image-r2';
import markdownToHtml from '@elog/plugin-transform-markdown-to-html';
import toWordPress from '@elog/plugin-to-wordpress';

export type E2eImageProfile =
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

export interface E2eProfile {
  id: string;
  cacheFile: string;
  image: E2eImageProfile;
}

export const e2eProfile: E2eProfile = {
  id: 'notion-to-wordpress',
  cacheFile: 'elog.cache.json',
  image: {
    kind: 'none',
  },
};

function createImageTransforms(image: E2eImageProfile): TransformPlugin[] {
  const imageTransforms =
    image.kind === 'local'
      ? [
          imageLocal({
            outputDir: image.outputDir,
            prefixKey: image.prefixKey,
            propertyImageFields: ['cover'],
          }),
        ]
      : image.kind === 'r2'
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
        : [];

  return [...imageTransforms, markdownToHtml()];
}

export function createNotionToWordPressConfig(profile: E2eProfile = e2eProfile): ElogConfig {
  return defineConfig({
    id: profile.id,
    cacheFilePath: profile.cacheFile,
    from: fromNotion({
      token: process.env.ELOG_E2E_NOTION_TOKEN,
      databaseId: process.env.ELOG_E2E_NOTION_DATABASE_ID,
      catalog: false,
    }),
    plugins: createImageTransforms(profile.image),
    to: toWordPress({
      endpoint: process.env.ELOG_E2E_WORDPRESS_ENDPOINT!,
      username: process.env.ELOG_E2E_WORDPRESS_USERNAME!,
      password: process.env.ELOG_E2E_WORDPRESS_PASSWORD!,
      enableUploadImage: false,
    }),
  }) as ElogConfig;
}

export default createNotionToWordPressConfig();
