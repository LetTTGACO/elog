/** 日志级别边界，和 logging/levels.ts 的常量保持一致。 */
export type LogLevel = 'warn' | 'info' | 'debug' | 'success' | 'error';
/** 业务日志函数统一接收头部和可选内容，便于终端对齐输出。 */
export type LoggingFunction = (head: string, content?: string) => void;
