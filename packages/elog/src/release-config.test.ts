import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

type PackageJson = {
  private?: boolean;
  publishConfig?: {
    access?: string;
    registry?: string;
  };
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  devDependencies?: Record<string, string>;
};

const repoRoot = path.resolve(process.cwd(), '../..');

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')) as T;
}

const publicPublishConfig = {
  access: 'public',
  registry: 'https://registry.npmjs.org/',
};

const newlyPublicPackages = ['plugins/transform/markdown-to-html'] as const;

const publicReleaseProjects = [
  '@elog/cli',
  '@elog/shared',
  '@elog/plugin-from-notion',
  '@elog/plugin-from-feishu-wiki',
  '@elog/plugin-from-feishu-space',
  '@elog/plugin-from-yuque-token',
  '@elog/plugin-from-yuque-pwd',
  '@elog/plugin-transform-image-local',
  '@elog/plugin-transform-image-cos',
  '@elog/plugin-transform-image-oss',
  '@elog/plugin-transform-image-github',
  '@elog/plugin-transform-image-qiniu',
  '@elog/plugin-transform-image-upyun',
  '@elog/plugin-transform-image-r2',
  '@elog/plugin-transform-image-b2',
  '@elog/plugin-transform-markdown-to-html',
  '@elog/plugin-to-local',
] as const;

const privatePluginPackages = [
  { project: '@elog/plugin-from-flowus', packageDir: 'plugins/from/flowus' },
  { project: '@elog/plugin-from-wolai', packageDir: 'plugins/from/wolai' },
  {
    project: '@elog/plugin-transform-markdown-to-confluence-wiki',
    packageDir: 'plugins/transform/markdown-to-confluence-wiki',
  },
  { project: '@elog/plugin-to-halo', packageDir: 'plugins/to/halo' },
  { project: '@elog/plugin-to-confluence', packageDir: 'plugins/to/confluence' },
  { project: '@elog/plugin-to-wordpress', packageDir: 'plugins/to/wordpress' },
] as const;

describe('release configuration', () => {
  it('makes stable body transforms public first-party plugins', () => {
    for (const packageDir of newlyPublicPackages) {
      const pkg = readJson<PackageJson>(path.join(packageDir, 'package.json'));

      expect(pkg.private, packageDir).toBeUndefined();
      expect(pkg.publishConfig, packageDir).toEqual(publicPublishConfig);
      expect(pkg.peerDependencies?.['@elog/cli'], packageDir).toBe('^1.0.0-beta.1');
      expect(pkg.peerDependenciesMeta?.['@elog/cli'], packageDir).toEqual({ optional: true });
      expect(pkg.devDependencies?.['@elog/cli'], packageDir).toBe('workspace:*');
    }
  });

  it('releases exactly the 1.0 public support matrix packages', () => {
    const nxJson = readJson<{ release: { projects: string[] } }>('nx.json');
    const privatePluginProjects = privatePluginPackages.map(({ project }) => project);

    expect(nxJson.release.projects).toEqual(publicReleaseProjects);
    expect(nxJson.release.projects).not.toEqual(expect.arrayContaining(privatePluginProjects));

    for (const { project, packageDir } of privatePluginPackages) {
      const pkg = readJson<PackageJson>(path.join(packageDir, 'package.json'));

      expect(pkg.private, project).toBe(true);
    }
  });
});
