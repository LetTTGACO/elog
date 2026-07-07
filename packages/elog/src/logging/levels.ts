export type LogLevel = 'warn' | 'info' | 'debug' | 'success' | 'error';
export type LoggingFunction = (head: string, content?: string) => void;

/** 日志级别常量保持字面量导出，方便命令层和测试复用同一套类型。 */
export const LOGLEVEL_ERROR: LogLevel = 'error';
export const LOGLEVEL_WARN: LogLevel = 'warn';
export const LOGLEVEL_INFO: LogLevel = 'info';
export const LOGLEVEL_SUCCESS: LogLevel = 'success';
export const LOGLEVEL_DEBUG: LogLevel = 'debug';

/** 数值越大表示终端展示优先级越高，供后续过滤/排序扩展使用。 */
export const logLevelPriority: Record<LogLevel, number> = {
  [LOGLEVEL_DEBUG]: 0,
  [LOGLEVEL_INFO]: 1,
  [LOGLEVEL_WARN]: 2,
  [LOGLEVEL_SUCCESS]: 3,
  [LOGLEVEL_ERROR]: 4,
};
