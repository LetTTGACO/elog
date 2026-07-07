import chalk from 'chalk';
import {
  LOGLEVEL_DEBUG,
  LOGLEVEL_ERROR,
  LOGLEVEL_INFO,
  LOGLEVEL_SUCCESS,
  LOGLEVEL_WARN,
  type LogLevel,
} from './levels';
import * as process from 'process';

/** 当前终端宽度，用于把长内容分片输出并保持日志头对齐。 */
export const __columns = process?.stdout?.columns ?? 120;

function chunkString(input: string, size: number) {
  const chunkSize = Math.max(size, 1);
  const chunks: string[] = [];
  for (let i = 0; i < input.length; i += chunkSize) {
    chunks.push(input.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * 辅助输出过程日志，兼顾中文字符宽度和多行内容对齐。
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
      // 无法 JSON 化时直接输出原对象，避免日志工具本身掩盖真实错误。
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

  const MIN_HEAD_LENGTH = 12;
  const emptyHead = head.replace(/[\u4e00-\u9fa5]/g, 'aa');

  const headLength = Math.max(emptyHead.length + 2, MIN_HEAD_LENGTH);
  const fillLength = Math.max(MIN_HEAD_LENGTH - emptyHead.length, 0);

  if (!content) {
    console.log(color[level](head));
    return;
  }

  if (content && typeof content !== 'string') {
    console.log(color[level](head));
    console.log(content);
    return;
  }

  (content ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((c) => chunkString(c, __columns - headLength))
    .reduce((r, c) => r.concat(c))
    .forEach((str, i) => {
      const _head = i ? ' '.repeat(headLength) : color[level](`${head}${' '.repeat(fillLength)}`);
      console.log(_head + str);
    });
}

/** 面向业务代码的日志门面，CLI fatal 行为只保留在 error 方法里。 */
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
    process.exit(1);
  },
  debug(head: string, content?: string) {
    process.env.DEBUG && println(LOGLEVEL_DEBUG, head, content);
  },
};

export default out;
