import chalk from 'chalk';
import { chunk } from 'lodash-es';
import { LogLevel } from '../types/log';
import {
  LOGLEVEL_DEBUG,
  LOGLEVEL_ERROR,
  LOGLEVEL_INFO,
  LOGLEVEL_SUCCESS,
  LOGLEVEL_WARN,
} from './logging';
import * as process from 'process';

export const __columns = process?.stdout?.columns ?? 120;

/**
 * 辅助输出过程日志
 *
 * @export
 * @param {LogLevel} level
 * @param {string} head
 * @param {string} [content]
 */
export function println(level: LogLevel, head: string, content?: string) {
  const color = {
    [LOGLEVEL_SUCCESS]: chalk.green,
    [LOGLEVEL_INFO]: chalk.blue,
    [LOGLEVEL_WARN]: chalk.yellow,
    [LOGLEVEL_ERROR]: chalk.red,
    [LOGLEVEL_DEBUG]: chalk.magenta,
  };
  if (typeof head === 'object' && !content) {
    try {
      head = JSON.stringify(head);
    } catch (e) {
      console.log(head);
      return;
    }
    console.log(color[level](head));
  }
  if (!head) {
    if (!content) {
      return;
    }
    head = content;
  }

  const MIN_HEAD_LENGTH = 14;
  const emptyHead = head.replace(/[\u4e00-\u9fa5]/g, 'aa');

  const headLength = Math.max(emptyHead.length + 2, MIN_HEAD_LENGTH);
  const fillLength = Math.max(MIN_HEAD_LENGTH - emptyHead.length, 0);

  if (!content) {
    // shell.echo(color[level](head))
    console.log(color[level](head));
    return;
  }

  if (content && typeof content !== 'string') {
    console.log(color[level](head));
    console.log(content);
    // shell.echo(color[level](head))
    // shell.echo(content)
    return;
  }

  (content ?? '')
    .replace('/\r\n/g', '\n')
    .split('\n')
    .map((c) => chunk(c, __columns - headLength).map((str) => str.join('')))
    .reduce((r, c) => r.concat(c))
    .forEach((str, i) => {
      const _head = i ? ' '.repeat(headLength) : color[level](`${head}${' '.repeat(fillLength)}`);
      console.log(_head + str);
    });
}

const out = {
  success(head: string, content?: string) {
    println(LOGLEVEL_SUCCESS, head, content);
  },
  info(head: string, content?: string) {
    println(LOGLEVEL_INFO, head, content);
  },
  warn(head: string, content?: string) {
    println(LOGLEVEL_WARN, head, content);
  },
  error(head: string): never {
    println(LOGLEVEL_ERROR, head);
    process.exit();
  },
  debug(head: string, content?: string) {
    process.env.DEBUG && println(LOGLEVEL_DEBUG, head, content);
  },
};

export default out;
