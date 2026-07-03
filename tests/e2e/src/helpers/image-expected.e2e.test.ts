import { describe, expect, it } from 'vitest';
import { imageExpectedFromProfile } from './image-expected';

describe('imageExpectedFromProfile', () => {
  it('returns local image expectations when local image files are expected', () => {
    expect(
      imageExpectedFromProfile({
        kind: 'local',
        outputDir: 'source/images',
        prefixKey: './images',
        expectFiles: true,
      }),
    ).toEqual({
      imageDir: 'source/images',
      minImageFiles: 1,
    });
  });

  it('returns no image expectations when image files are not expected', () => {
    expect(imageExpectedFromProfile({ kind: 'none' })).toEqual({});
    expect(
      imageExpectedFromProfile({
        kind: 'local',
        outputDir: 'source/images',
        prefixKey: './images',
        expectFiles: false,
      }),
    ).toEqual({});
    expect(imageExpectedFromProfile({ kind: 'r2' })).toEqual({});
  });
});
