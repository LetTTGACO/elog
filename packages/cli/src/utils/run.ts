import { execSync } from 'child_process'
import { out } from '@elog/shared'
/**
 * 同步执行命令
 * @param command
 */
export const runCmdSync = (command: string) => {
  const cwd = process.cwd()
  out.info('目录', cwd)
  out.info('执行', command)
  const output = execSync(command)
  out.info('输出', output.toString().trim())
}
