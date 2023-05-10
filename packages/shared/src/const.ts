/** 当前命令执行目录 */
export const __cwd = process.cwd()
export const __columns = process?.stdout?.columns ?? 120

export enum LogLevel {
  ACCESS,
  INFO,
  WARNING,
  ERROR,
  DEBUG,
}
