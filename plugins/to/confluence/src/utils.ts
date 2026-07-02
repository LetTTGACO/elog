import type { DocDetail } from '@elog/cli';
import { md2Wiki } from './WikiRender';
/**
 * 将markdown转wiki
 * @param post
 */
export function wikiAdapter(post: DocDetail) {
  const { body } = post;
  return md2Wiki(body);
}
