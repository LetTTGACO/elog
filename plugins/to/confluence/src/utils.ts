import type { DocDetail } from '@elogx-test/elog';
import { md2Wiki } from './WikiRender';
/**
 * 将markdown转wiki
 * @param post
 */
export function wikiAdapter(post: DocDetail) {
  const { body } = post;
  return md2Wiki(body);
}
