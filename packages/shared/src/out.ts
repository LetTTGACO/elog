import * as shell from 'shelljs'
import chalk, { Chalk } from 'chalk'
import { chunk } from 'lodash'
import { LogLevel, __columns } from './const'
import * as process from 'process'

/**
 * 辅助输出过程日志
 *
 * @export
 * @param {LogLevel} level
 * @param {string} head
 * @param {string} [content]
 */
export function println(level: LogLevel, head: string, content?: string) {
  const color: Record<LogLevel, Chalk> = {
    [LogLevel.ACCESS]: chalk.blue,
    [LogLevel.INFO]: chalk.green,
    [LogLevel.WARNING]: chalk.yellow,
    [LogLevel.ERROR]: chalk.red,
    [LogLevel.DEBUG]: chalk.magenta,
  }
  if (typeof head === 'object' && !content) {
    try {
      head = JSON.stringify(head)
    } catch (e) {
      console.log(head)
      return
    }
    shell.echo(color[level](head))
  }
  if (!head) {
    if (!content) {
      return
    }
    head = content
  }

  const MIN_HEAD_LENGTH = 10
  const emptyHead = head.replace(/[\u4e00-\u9fa5]/g, 'aa')

  const headLength = Math.max(emptyHead.length + 2, MIN_HEAD_LENGTH)
  const fillLength = Math.max(MIN_HEAD_LENGTH - emptyHead.length, 0)

  if (!content) {
    shell.echo(color[level](head))
    return
  }

  if (content && typeof content !== 'string') {
    shell.echo(color[level](head))
    shell.echo(content)
    return
  }

  ;(content ?? '')
    .replace('/\r\n/g', '\n')
    .split('\n')
    .map((c) => chunk(c, __columns - headLength).map((str) => str.join('')))
    .reduce((r, c) => r.concat(c))
    .forEach((str, i) => {
      const _head = i ? ' '.repeat(headLength) : color[level](`${head}${' '.repeat(fillLength)}`)
      shell.echo(_head + str)
    })
}

const out = {
  access(head: string, content?: string) {
    println(LogLevel.ACCESS, head, content)
  },
  info(head: string, content?: string) {
    println(LogLevel.INFO, head, content)
  },
  warning(head: string, content?: string) {
    println(LogLevel.WARNING, head, content)
  },
  err(head: string, content?: string) {
    println(LogLevel.ERROR, head, content)
  },
  debug(head: string, content?: string) {
    process.env.DEBUG && println(LogLevel.DEBUG, head, content)
  },
}

export default out
