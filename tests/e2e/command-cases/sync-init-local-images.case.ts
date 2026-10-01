import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';
import { generateInitFiles } from '../../../packages/cli/src/commands/init/generator';
import { loadBuiltInPluginRegistry } from '../../../packages/cli/src/commands/init/registry';
import type { PluginRegistryEntry } from '../../../packages/cli/src/commands/init/types';
import { expectExitCode } from '../src/helpers/assertions';
import type { CommandCase } from '../src/helpers/types';

const commandCase: CommandCase = {
  id: 'sync-init-local-images',
  command: ['sync', '--config', 'elog.config.ts'],
  setup({ workspace }) {
    const registry = loadBuiltInPluginRegistry();
    const fromFixture: PluginRegistryEntry = {
      kind: 'from',
      type: 'fixture',
      displayName: 'Fixture',
      packageName: './from-fixture.ts',
      importName: 'fromFixture',
      optionsSchema: { type: 'object' },
    };
    const files = generateInitFiles({
      from: fromFixture,
      transforms: [registry.plugins.find((entry) => entry.type === 'image-local')!],
      to: [registry.plugins.find((entry) => entry.kind === 'to' && entry.type === 'local')!],
    });
    fs.writeFileSync(path.join(workspace, 'elog.config.ts'), files.configText);
    fs.writeFileSync(
      path.join(workspace, 'from-fixture.ts'),
      `import type { FromPlugin } from '@elog/plugin-sdk';

export default function fromFixture(): FromPlugin {
  const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1sAAAAASUVORK5CYII=';
  const docs = [
    { id: 'root', title: 'Root' },
    { id: 'empty', title: 'Empty', docStructure: [] },
    { id: 'nested', title: 'Nested', docStructure: [{ id: 'first', title: '一级' }, { id: 'second', title: '二级' }] },
  ].map((doc) => ({
    ...doc,
    updateTime: 1,
    body: '![pixel](' + pixel + ')',
    properties: { title: doc.title, urlname: doc.id },
  }));
  return {
    name: 'from:fixture',
    kind: 'from',
    async download() {
      return {
        docDetailList: docs,
        sortedDocList: docs.map(({ id, updateTime }) => ({ id, updateTime })),
        docStatusMap: Object.fromEntries(docs.map(({ id }) => [id, { _updateIndex: -1, _status: 1 }])),
      };
    },
  };
}
`,
    );
  },
  expect({ result, workspace }) {
    expectExitCode(result, 0);
    for (const relativePath of ['docs/Root.md', 'docs/Empty.md', 'docs/一级/二级/Nested.md']) {
      const docPath = path.join(workspace, relativePath);
      const body = fs.readFileSync(docPath, 'utf8');
      const imagePath = body.match(/!\[pixel\]\(([^)]+)\)/)?.[1];
      expect(imagePath, relativePath).toBeDefined();
      expect(imagePath, relativePath).not.toMatch(/^data:/);
      const resolvedPath = path.resolve(path.dirname(docPath), imagePath!);
      expect(fs.existsSync(resolvedPath), `${relativePath}: ${imagePath}`).toBe(true);
      expect(path.dirname(resolvedPath)).toBe(path.join(workspace, 'images'));
      expect(fs.statSync(resolvedPath).size).toBeGreaterThan(0);
    }
  },
};

export default commandCase;
