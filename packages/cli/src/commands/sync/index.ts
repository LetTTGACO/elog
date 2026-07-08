/** sync 命令公共入口，CLI 通过这里注册同步命令。 */
export { runSyncCommand } from './command';
/** 结果格式化单独导出，便于测试和外部复用结构化输出。 */
export { formatWorkflowResults } from './format';
