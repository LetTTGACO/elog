import { LogLevel } from '../types/log';

export const LOGLEVEL_ERROR: LogLevel = 'error';
export const LOGLEVEL_WARN: LogLevel = 'warn';
export const LOGLEVEL_INFO: LogLevel = 'info';
export const LOGLEVEL_SUCCESS: LogLevel = 'success';
export const LOGLEVEL_DEBUG: LogLevel = 'debug';

export const logLevelPriority: Record<LogLevel, number> = {
  [LOGLEVEL_DEBUG]: 0,
  [LOGLEVEL_INFO]: 1,
  [LOGLEVEL_WARN]: 2,
  [LOGLEVEL_SUCCESS]: 3,
  [LOGLEVEL_ERROR]: 4,
};
