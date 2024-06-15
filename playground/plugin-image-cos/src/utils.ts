/**
 * 生成路径前缀
 * 固定格式 'prefix/'，开头无需/，结尾需要/，如果没传，则默认为空
 * @param prefix
 */

export const formattedPrefix = (prefix?: string): string => {
  // 如果没传，则默认为空
  if (!prefix) return '';

  let _prefix = prefix;

  // 如果开头无需/
  if (_prefix.startsWith('/')) {
    _prefix = _prefix.slice(1);
  }

  // 如果结尾需要/
  if (!_prefix.endsWith('/')) {
    _prefix = `${_prefix}/`;
  }

  return _prefix;
};
