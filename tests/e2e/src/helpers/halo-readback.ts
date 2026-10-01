import type { DocDetail } from '@elog/plugin-sdk';
import { expect } from 'vitest';

export interface HaloCredentials {
  endpoint: string;
  token: string;
}

export interface HaloPostReadback {
  post: {
    metadata: { name: string };
    spec: {
      title: string;
      slug: string;
      cover?: string;
      publish: boolean;
      headSnapshot: string;
      releaseSnapshot: string;
    };
  };
  head: { content: string; raw: string; rawType: string; snapshotName: string };
  release: { content: string; raw: string; rawType: string; snapshotName: string };
}

export async function readHaloPost(
  name: string,
  credentials: HaloCredentials,
): Promise<HaloPostReadback> {
  const endpoint = credentials.endpoint.replace(/\/+$/, '');
  async function get<T>(route: string): Promise<T> {
    const response = await fetch(`${endpoint}${route}`, {
      headers: { Authorization: `Bearer ${credentials.token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Halo readback ${route}: HTTP ${response.status}`);
    return response.json() as Promise<T>;
  }
  const postName = encodeURIComponent(name);
  const [post, head, release] = await Promise.all([
    get<HaloPostReadback['post']>(`/apis/content.halo.run/v1alpha1/posts/${postName}`),
    get<HaloPostReadback['head']>(
      `/apis/api.console.halo.run/v1alpha1/posts/${postName}/head-content`,
    ),
    get<HaloPostReadback['release']>(
      `/apis/api.console.halo.run/v1alpha1/posts/${postName}/release-content`,
    ),
  ]);
  return { post, head, release };
}

export async function readPublishedHaloPost(
  name: string,
  credentials: HaloCredentials,
  matches: (readback: HaloPostReadback) => boolean = () => true,
): Promise<HaloPostReadback> {
  let readback: HaloPostReadback;
  await expect
    .poll(
      async () => {
        readback = await readHaloPost(name, credentials);
        return readback;
      },
      { timeout: 15_000, interval: 250 },
    )
    .toSatisfy(
      ({ post, head, release }: HaloPostReadback) =>
        typeof head.snapshotName === 'string' &&
        head.snapshotName === post.spec.headSnapshot &&
        head.snapshotName === post.spec.releaseSnapshot &&
        head.snapshotName === release.snapshotName &&
        matches({ post, head, release }),
    );
  return readback!;
}

export async function expectHaloPosts(
  docs: Pick<DocDetail, 'id' | 'properties'>[],
  credentials: HaloCredentials,
  image: { host: string; prefixKey: string },
  fixture: { minCovers: number } = { minCovers: 1 },
): Promise<HaloPostReadback[]> {
  expect(docs.length, 'Halo fixture must contain deployable documents').toBeGreaterThan(0);
  const base = new URL(/^https?:\/\//.test(image.host) ? image.host : `https://${image.host}`);
  const prefix = `${base.pathname.replace(/\/+$/, '')}/${image.prefixKey.replace(/^\/+|\/+$/g, '')}/`;
  const expectHostedImage = (href: string) => {
    const url = new URL(href);
    expect(url.origin).toBe(base.origin);
    expect(url.pathname.startsWith(prefix)).toBe(true);
  };
  const readbacks: HaloPostReadback[] = [];
  let imageCount = 0;
  let coverCount = 0;
  for (const doc of docs) {
    const readback = await readPublishedHaloPost(doc.id, credentials);
    const { post, head, release } = readback;
    expect(post.metadata.name).toBe(doc.id);
    expect(post.spec.title).toBe(doc.properties.title);
    expect(post.spec.slug).toBe(doc.properties.urlname);
    expect(post.spec.publish).toBe(true);
    expect(post.spec.cover ?? '').toBe(doc.properties.cover ?? '');
    expect(head.rawType).toBe('markdown');
    expect(head.raw.trim().length).toBeGreaterThan(0);
    expect(head.content).toMatch(/<[a-z][^>]*>/i);
    expect(release.content).toBe(head.content);
    expect(release.raw).toBe(head.raw);
    expect(release.rawType).toBe(head.rawType);
    const htmlImages = [...head.content.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(
      (match) => match[1],
    );
    for (const href of htmlImages) {
      expectHostedImage(href);
      imageCount += 1;
    }
    for (const match of head.raw.matchAll(/!\[[^\]]*]\(([^)]+)\)/g)) {
      expectHostedImage(match[1]);
      expect(htmlImages, 'Markdown body images must survive HTML conversion').toContain(match[1]);
    }
    if (post.spec.cover) {
      expectHostedImage(post.spec.cover);
      coverCount += 1;
    }
    readbacks.push(readback);
  }
  expect(imageCount, 'Halo fixture must contain body images').toBeGreaterThan(0);
  expect(coverCount, 'Halo fixture cover count').toBeGreaterThanOrEqual(fixture.minCovers);
  return readbacks;
}
