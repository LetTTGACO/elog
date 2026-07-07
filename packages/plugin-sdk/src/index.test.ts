import { afterEach, describe, expect, it } from 'vitest';
import {
  DocSyncStatus,
  ElogBaseContext,
  ElogFromContext,
  ElogImageContext,
  formatTime,
  type DocDetail,
  type DownloadResult,
  type PluginContext,
  type ToPlugin,
} from './index';

function createContext(overrides: Partial<PluginContext> = {}): PluginContext {
  return {
    workflow: { id: 'workflow-1', cacheFilePath: 'elog.cache.json' },
    logger: {
      debug() {},
      success() {},
      error(head): never {
        throw new Error(head);
      },
      info() {},
      warn() {},
    },
    http: async <T>() => ({ status: 200, headers: {}, data: undefined as T }),
    cache: {
      docList: [],
    },
    image: {
      genUniqueIdFromUrl: () => 'image-id',
      getFileTypeFromUrl: () => ({ type: 'png' }),
      getFileTypeFromBuffer: () => ({ type: 'png' }),
      cleanUrlParam: (url) => url,
      getUrlListFromContent: () => [],
      getBaseUrl: (url) => ({ originalUrl: url, data: url, type: 'url' }),
      getFileType: async () => ({ type: 'png' }),
      getBufferFromUrl: async () => Buffer.from('image'),
      getImageDataUrl: () => ({ type: 'png', payload: 'aW1hZ2U=', buffer: Buffer.from('image') }),
      formatImagePrefix: (prefix) => (prefix ? `${prefix}/` : ''),
    },
    ...overrides,
  };
}

function createDoc(overrides: Partial<DocDetail> = {}): DocDetail {
  return {
    id: 'doc-1',
    title: 'Doc',
    updateTime: 1,
    body: '',
    properties: {
      urlname: 'doc',
      title: 'Doc',
    },
    ...overrides,
  };
}

describe('plugin sdk public surface', () => {
  afterEach(() => {
    delete process.env.TIME_ZONE;
  });

  it('exports plugin helper classes and document sync status values', () => {
    const base = new ElogBaseContext(createContext());
    const plugin: ToPlugin = {
      name: 'to:test',
      kind: 'to',
      deploy() {},
    };

    expect(base.ctx.workflow.id).toBe('workflow-1');
    expect(plugin.kind).toBe('to');
    expect(DocSyncStatus.NEW).toBe(1);
    expect(DocSyncStatus.UPDATE).toBe(2);
  });

  it('formats time with the default timezone and process override', () => {
    expect(formatTime('2026-06-30T22:56:00.000Z')).toBe('2026-07-01 06:56:00');

    process.env.TIME_ZONE = 'UTC';

    expect(formatTime('2026-06-30T22:56:00.000Z')).toBe('2026-06-30 22:56:00');
  });

  it('filters and downloads source documents through ElogFromContext', async () => {
    class TestFromContext extends ElogFromContext {
      constructor(ctx: PluginContext) {
        super(ctx);
      }

      async getDocDetailList(): Promise<DownloadResult> {
        return this.docDetailList({
          getSortedDocList: async () => [
            {
              id: 'new-doc',
              updateTime: 2,
              properties: {
                title: 'New Doc',
              },
            },
          ],
          getDocDetail: async (doc) =>
            createDoc({
              id: doc.id,
              title: doc.properties.title,
              updateTime: doc.updateTime,
              properties: {
                urlname: doc.id,
                title: doc.properties.title,
              },
            }),
          limit: 1,
        });
      }
    }

    const result = await new TestFromContext(createContext()).getDocDetailList();

    expect(result.docDetailList).toHaveLength(1);
    expect(result.docStatusMap['new-doc']).toEqual({
      _updateIndex: -1,
      _status: DocSyncStatus.NEW,
    });
  });

  it('replaces images through injected plugin-context image capabilities', async () => {
    const ctx = createContext({
      image: {
        ...createContext().image,
        genUniqueIdFromUrl: (url) => {
          expect(url).toBe('https://img.test/a.png');
          return 'stable-image';
        },
        getUrlListFromContent: () => [
          {
            originalUrl: 'https://img.test/a.png?size=1',
            data: 'https://img.test/a.png',
            type: 'url',
          },
        ],
      },
    });
    const docs = [
      createDoc({
        body: '![alt](https://img.test/a.png?size=1)',
      }),
    ];
    const helper = new ElogImageContext(ctx, {});

    const result = await helper.replaceImages(
      docs,
      {
        hasImage: async () => undefined,
        uploadImage: async (fileName, buffer, doc) => {
          expect(fileName).toBe('stable-image.png');
          expect(buffer.toString()).toBe('image');
          expect(doc?.id).toBe('doc-1');
          return 'https://cdn.test/stable-image.png';
        },
      },
      1,
    );

    expect(result[0].body).toBe('![alt](https://cdn.test/stable-image.png)');
  });
});
