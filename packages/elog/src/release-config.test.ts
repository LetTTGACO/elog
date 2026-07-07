import fs from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';
import { describe, expect, it } from 'vitest';

type PackageJson = {
  private?: boolean;
  publishConfig?: {
    access?: string;
    registry?: string;
  };
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  devDependencies?: Record<string, string>;
};

const repoRoot = path.resolve(process.cwd(), '../..');

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')) as T;
}

function discoverPackageDirs(parentDirs: string[]): string[] {
  return parentDirs.flatMap((parentDir) => {
    const absoluteParentDir = path.join(repoRoot, parentDir);
    return fs
      .readdirSync(absoluteParentDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(parentDir, entry.name))
      .filter((packageDir) => fs.existsSync(path.join(repoRoot, packageDir, 'package.json')));
  });
}

function discoverPluginPackageDirs(): string[] {
  return discoverPackageDirs(['plugins/from', 'plugins/transform', 'plugins/to']);
}

function discoverWorkspacePackageDirs(): string[] {
  return discoverPackageDirs([
    'packages',
    'plugins/from',
    'plugins/transform',
    'plugins/to',
    'tests',
  ]);
}

const publicPublishConfig = {
  access: 'public',
  registry: 'https://registry.npmjs.org/',
};

const newlyPublicPackages = ['plugins/transform/markdown-to-html', 'plugins/to/halo'] as const;

const publicReleaseProjects = [
  '@elog/cli',
  '@elog/core',
  '@elog/plugin-sdk',
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
  '@elog/plugin-to-halo',
] as const;

const retiredPublicProjects = ['@elog/shared'] as const;

const privatePluginPackages = [
  { project: '@elog/plugin-from-flowus', packageDir: 'plugins/from/flowus' },
  { project: '@elog/plugin-from-wolai', packageDir: 'plugins/from/wolai' },
  {
    project: '@elog/plugin-transform-markdown-to-confluence-wiki',
    packageDir: 'plugins/transform/markdown-to-confluence-wiki',
  },
  { project: '@elog/plugin-to-confluence', packageDir: 'plugins/to/confluence' },
  { project: '@elog/plugin-to-wordpress', packageDir: 'plugins/to/wordpress' },
] as const;

describe('release configuration', () => {
  it('makes newly public first-party plugins publishable', () => {
    for (const packageDir of newlyPublicPackages) {
      const pkg = readJson<PackageJson>(path.join(packageDir, 'package.json'));

      expect(pkg.private, packageDir).toBeUndefined();
      expect(pkg.publishConfig, packageDir).toEqual(publicPublishConfig);
      expect(pkg.dependencies?.['@elog/plugin-sdk'], packageDir).toBe('workspace:^');
    }
  });

  it('keeps every repository plugin depending on the Plugin SDK instead of CLI or Shared', () => {
    for (const packageDir of discoverPluginPackageDirs()) {
      const pkg = readJson<PackageJson>(path.join(packageDir, 'package.json'));

      expect(pkg.dependencies?.['@elog/plugin-sdk'], packageDir).toBe('workspace:^');
      expect(pkg.dependencies?.['@elog/cli'], packageDir).toBeUndefined();
      expect(pkg.dependencies?.['@elog/shared'], packageDir).toBeUndefined();
      expect(pkg.peerDependencies?.['@elog/cli'], packageDir).toBeUndefined();
      expect(pkg.peerDependencies?.['@elog/shared'], packageDir).toBeUndefined();
      expect(pkg.peerDependenciesMeta?.['@elog/cli'], packageDir).toBeUndefined();
      expect(pkg.peerDependenciesMeta?.['@elog/shared'], packageDir).toBeUndefined();
      expect(pkg.devDependencies?.['@elog/cli'], packageDir).toBeUndefined();
      expect(pkg.devDependencies?.['@elog/shared'], packageDir).toBeUndefined();
    }
  });

  it('keeps Shared out of every workspace package manifest', () => {
    for (const packageDir of discoverWorkspacePackageDirs()) {
      const pkg = readJson<PackageJson>(path.join(packageDir, 'package.json'));

      expect(pkg.dependencies?.['@elog/shared'], packageDir).toBeUndefined();
      expect(pkg.peerDependencies?.['@elog/shared'], packageDir).toBeUndefined();
      expect(pkg.peerDependenciesMeta?.['@elog/shared'], packageDir).toBeUndefined();
      expect(pkg.devDependencies?.['@elog/shared'], packageDir).toBeUndefined();
    }
  });

  it('releases exactly the 1.0 public support matrix packages', () => {
    const nxJson = readJson<{
      release: {
        projects: string[];
        projectsRelationship: string;
        version: { updateDependents: string };
      };
    }>('nx.json');
    const privatePluginProjects = privatePluginPackages.map(({ project }) => project);

    expect(nxJson.release.projects).toEqual(publicReleaseProjects);
    expect(nxJson.release.projects).not.toEqual(expect.arrayContaining([...retiredPublicProjects]));
    expect(nxJson.release.projects).not.toEqual(expect.arrayContaining(privatePluginProjects));
    expect(nxJson.release.projectsRelationship).toBe('independent');
    expect(nxJson.release.version.updateDependents).toBe('never');

    for (const { project, packageDir } of privatePluginPackages) {
      const pkg = readJson<PackageJson>(path.join(packageDir, 'package.json'));

      expect(pkg.private, project).toBe(true);
    }
  });

  it('removes the retired Shared package from the workspace', () => {
    expect(fs.existsSync(path.join(repoRoot, 'packages/shared/package.json'))).toBe(false);
  });

  it('keeps CLI registry-only changes from affecting first-party plugins through CLI', () => {
    const affected = JSON.parse(
      execFileSync(
        'pnpm',
        [
          'nx',
          'show',
          'projects',
          '--affected',
          '--files',
          'packages/elog/src/commands/init/registry.ts',
        ],
        {
          cwd: repoRoot,
          encoding: 'utf8',
          env: { ...process.env, NX_DAEMON: 'false' },
        },
      ),
    ) as string[];
    const pluginProjects = discoverPluginPackageDirs().map(
      (packageDir) => readJson<{ name: string }>(path.join(packageDir, 'package.json')).name,
    );

    expect(affected).toContain('@elog/cli');
    expect(affected).not.toEqual(expect.arrayContaining(pluginProjects));
  });
});
