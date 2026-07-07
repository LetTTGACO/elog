import { defineConfig } from '@elog/core';
import type { TransformPlugin } from '@elog/plugin-sdk';
import fromYuque from '@elog/plugin-from-yuque-pwd';
import imageB2 from '@elog/plugin-transform-image-b2';
import imageCos from '@elog/plugin-transform-image-cos';
import imageGithub from '@elog/plugin-transform-image-github';
import imageLocal from '@elog/plugin-transform-image-local';
import imageOss from '@elog/plugin-transform-image-oss';
import imageQiniu from '@elog/plugin-transform-image-qiniu';
import imageR2 from '@elog/plugin-transform-image-r2';
import imageUpyun from '@elog/plugin-transform-image-upyun';
import toLocal from '@elog/plugin-to-local';

type E2eCloudImageKind = 'b2' | 'cos' | 'github' | 'oss' | 'qiniu' | 'r2' | 'upyun';

type E2eImageProfile =
  | {
      kind: 'local';
      outputDir: string;
      pathFollowDoc?: {
        enable: boolean;
        docOutputDir: string;
      };
      expectFiles?: boolean;
    }
  | { kind: E2eCloudImageKind; prefixKey?: string; expectFiles?: false };

type E2eImageKind = E2eImageProfile['kind'];

const env = process.env;
const docOutputDir = 'docs';
const cloudPrefixKey = 'elog-e2e/yuque-pwd/';

const imageProfiles: Record<E2eImageKind, E2eImageProfile> = {
  local: {
    kind: 'local',
    outputDir: 'images',
    pathFollowDoc: {
      enable: true,
      docOutputDir,
    },
    expectFiles: true,
  },
  b2: { kind: 'b2', prefixKey: cloudPrefixKey },
  cos: { kind: 'cos', prefixKey: cloudPrefixKey },
  github: { kind: 'github', prefixKey: cloudPrefixKey },
  oss: { kind: 'oss', prefixKey: cloudPrefixKey },
  qiniu: { kind: 'qiniu', prefixKey: cloudPrefixKey },
  r2: { kind: 'r2', prefixKey: cloudPrefixKey },
  upyun: { kind: 'upyun', prefixKey: cloudPrefixKey },
};

function selectImageProfile(): E2eImageProfile {
  const imageKind = env.ELOG_E2E_IMAGE ?? 'local';

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
        pathFollowDoc: image.pathFollowDoc,
      }),
    ];
  }

  return [
    {
      b2: () =>
        imageB2({
          host: env.ELOG_E2E_B2_HOST!,
          applicationKeyId: env.ELOG_E2E_B2_APPLICATION_KEY_ID!,
          applicationKey: env.ELOG_E2E_B2_APPLICATION_KEY!,
          bucket: env.ELOG_E2E_B2_BUCKET!,
          prefixKey: image.prefixKey,
        }),
      cos: () =>
        imageCos({
          secretId: env.ELOG_E2E_COS_SECRET_ID!,
          secretKey: env.ELOG_E2E_COS_SECRET_KEY!,
          bucket: env.ELOG_E2E_COS_BUCKET!,
          region: env.ELOG_E2E_COS_REGION!,
          host: env.ELOG_E2E_COS_HOST,
          prefixKey: image.prefixKey,
        }),
      github: () =>
        imageGithub({
          user: env.ELOG_E2E_GITHUB_USER!,
          token: env.ELOG_E2E_GITHUB_TOKEN!,
          repo: env.ELOG_E2E_GITHUB_REPO!,
          branch: env.ELOG_E2E_GITHUB_BRANCH,
          host: env.ELOG_E2E_GITHUB_HOST,
          prefixKey: image.prefixKey,
        }),
      oss: () =>
        imageOss({
          secretId: env.ELOG_E2E_OSS_SECRET_ID!,
          secretKey: env.ELOG_E2E_OSS_SECRET_KEY!,
          bucket: env.ELOG_E2E_OSS_BUCKET!,
          region: env.ELOG_E2E_OSS_REGION!,
          host: env.ELOG_E2E_OSS_HOST,
          prefixKey: image.prefixKey,
        }),
      qiniu: () =>
        imageQiniu({
          secretId: env.ELOG_E2E_QINIU_SECRET_ID!,
          secretKey: env.ELOG_E2E_QINIU_SECRET_KEY!,
          bucket: env.ELOG_E2E_QINIU_BUCKET!,
          region: env.ELOG_E2E_QINIU_REGION!,
          host: env.ELOG_E2E_QINIU_HOST!,
          prefixKey: image.prefixKey,
        }),
      r2: () =>
        imageR2({
          host: env.ELOG_E2E_R2_HOST!,
          accessKeyId: env.ELOG_E2E_R2_ACCESS_KEY_ID!,
          secretAccessKey: env.ELOG_E2E_R2_SECRET_ACCESS_KEY!,
          bucket: env.ELOG_E2E_R2_BUCKET!,
          endpoint: env.ELOG_E2E_R2_ENDPOINT!,
          region: env.ELOG_E2E_R2_REGION,
          prefixKey: image.prefixKey,
        }),
      upyun: () =>
        imageUpyun({
          bucket: env.ELOG_E2E_UPYUN_BUCKET!,
          user: env.ELOG_E2E_UPYUN_USER!,
          password: env.ELOG_E2E_UPYUN_PASSWORD!,
          host: env.ELOG_E2E_UPYUN_HOST,
          prefixKey: image.prefixKey,
        }),
    }[image.kind](),
  ];
}

export const e2eProfile: {
  id: string;
  cacheFile: string;
  docOutputDir: string;
  image: E2eImageProfile;
} = {
  id: 'yuque-pwd-to-local',
  cacheFile: 'elog.cache.json',
  docOutputDir,
  image: selectImageProfile(),
};

export default defineConfig({
  id: e2eProfile.id,
  cacheFilePath: e2eProfile.cacheFile,
  from: fromYuque({
    username: process.env.ELOG_E2E_YUQUE_USERNAME,
    password: process.env.ELOG_E2E_YUQUE_PWD,
    login: process.env.ELOG_E2E_YUQUE_LOGIN,
    repo: process.env.ELOG_E2E_YUQUE_REPO_TOC,
  }),
  plugins: createImagePlugins(e2eProfile.image),
  to: toLocal({
    outputDir: e2eProfile.docOutputDir,
    keepToc: true,
    frontMatter: { enable: true },
  }),
});
