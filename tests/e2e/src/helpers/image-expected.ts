import type { SyncCaseExpected } from './types';

export type E2eImageProfile =
  | {
      kind: 'local';
      outputDir: string;
      pathFollowDoc?: {
        enable: boolean;
        docOutputDir: string;
      };
      expectFiles?: boolean;
    }
  | {
      kind: 'b2' | 'cos' | 'github' | 'oss' | 'qiniu' | 'r2' | 'upyun';
      prefixKey?: string;
      expectFiles?: false;
    };

const requiredEnvByImageKind: Record<E2eImageProfile['kind'], string[]> = {
  local: [],
  b2: [
    'ELOG_E2E_B2_HOST',
    'ELOG_E2E_B2_APPLICATION_KEY_ID',
    'ELOG_E2E_B2_APPLICATION_KEY',
    'ELOG_E2E_B2_BUCKET',
  ],
  cos: [
    'ELOG_E2E_COS_SECRET_ID',
    'ELOG_E2E_COS_SECRET_KEY',
    'ELOG_E2E_COS_BUCKET',
    'ELOG_E2E_COS_REGION',
  ],
  github: ['ELOG_E2E_GITHUB_USER', 'ELOG_E2E_GITHUB_TOKEN', 'ELOG_E2E_GITHUB_REPO'],
  oss: [
    'ELOG_E2E_OSS_SECRET_ID',
    'ELOG_E2E_OSS_SECRET_KEY',
    'ELOG_E2E_OSS_BUCKET',
    'ELOG_E2E_OSS_REGION',
  ],
  qiniu: [
    'ELOG_E2E_QINIU_SECRET_ID',
    'ELOG_E2E_QINIU_SECRET_KEY',
    'ELOG_E2E_QINIU_BUCKET',
    'ELOG_E2E_QINIU_REGION',
    'ELOG_E2E_QINIU_HOST',
  ],
  r2: [
    'ELOG_E2E_R2_HOST',
    'ELOG_E2E_R2_ACCESS_KEY_ID',
    'ELOG_E2E_R2_SECRET_ACCESS_KEY',
    'ELOG_E2E_R2_BUCKET',
    'ELOG_E2E_R2_ENDPOINT',
  ],
  upyun: ['ELOG_E2E_UPYUN_BUCKET', 'ELOG_E2E_UPYUN_USER', 'ELOG_E2E_UPYUN_PASSWORD'],
};

export function imageExpectedFromProfile(
  image: E2eImageProfile,
): Partial<Pick<SyncCaseExpected, 'imageDir' | 'minImageFiles'>> {
  if (image.kind !== 'local' || !image.expectFiles) {
    return {};
  }

  return {
    imageDir: image.outputDir,
    minImageFiles: 1,
  };
}

export function imageRequiredEnvFromProfile(image: E2eImageProfile): string[] {
  return requiredEnvByImageKind[image.kind];
}
