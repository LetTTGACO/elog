import { afterEach, describe, expect, it } from 'vitest';
import { props } from './utils';
import type { NotionDoc } from './types';

function page(overrides: Record<string, unknown> = {}) {
  return {
    id: 'page-1',
    created_time: '2026-06-30T22:56:00.000Z',
    last_edited_time: '2026-06-30T22:56:00.000Z',
    properties: {
      title: {
        type: 'title',
        title: [{ plain_text: 'Page 1' }],
      },
    },
    ...overrides,
  } as unknown as NotionDoc;
}

describe('Notion properties', () => {
  afterEach(() => {
    delete process.env.TIME_ZONE;
  });

  it('formats generated timestamps in Asia/Shanghai by default', () => {
    expect(props(page())).toMatchObject({
      date: '2026-07-01 06:56:00',
      updated: '2026-07-01 06:56:00',
    });
  });

  it('formats generated timestamps in process.env.TIME_ZONE when set', () => {
    process.env.TIME_ZONE = 'UTC';

    expect(props(page())).toMatchObject({
      date: '2026-06-30 22:56:00',
      updated: '2026-06-30 22:56:00',
    });
  });

  it('formats Notion date properties in the configured timezone', () => {
    expect(
      props(
        page({
          properties: {
            title: {
              type: 'title',
              title: [{ plain_text: 'Page 1' }],
            },
            publishAt: {
              type: 'date',
              date: {
                start: '2026-06-30T22:56:00.000Z',
              },
            },
          },
        }),
      ),
    ).toMatchObject({
      publishAt: '2026-07-01 06:56:00',
    });
  });
});
