import type { SyncCaseExpected } from './types';

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
