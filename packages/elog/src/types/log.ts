export type LogLevel = 'warn' | 'info' | 'debug' | 'success' | 'error';
export type LoggingFunction = (head: string, content?: string) => void;
