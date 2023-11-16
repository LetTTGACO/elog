import { out } from '@elog/shared'
import path from 'path'
import fs from 'fs'
import { ImageConfig, ImagePlugin } from './types'

interface SecretExt {
  secretExt?: string
}

export const getSecretExt = async <T>(config: T & SecretExt) => {
  out.warning('注意', '正在使用密钥拓展点，请遵循密钥拓展点注入规范')
  try {
    // 如果指定了secret拓展点，那么拓展点返回的账号密码信息，将会覆盖elog-config.json中的image信息
    const secretExtPath = path.resolve(process.cwd(), config.secretExt!)
    // 拓展点需要暴露getSecret方法
    const { getSecret } = require(secretExtPath)
    const ext = await getSecret()
    config = { ...config, ...ext }
    return config
  } catch (e: any) {
    out.err(e.message)
    out.err('执行失败', '密钥拓展点执行失败，请检查！')
    process.exit(1)
  }
}

export const getImagePathExt = (imagePathExt: string) => {
  out.warning('注意', '正在使用图片路径拓展点，请遵循拓展点注入规范')
  try {
    const imagePathExtPath = path.resolve(process.cwd(), imagePathExt)
    const { getImagePath } = require(imagePathExtPath)
    return getImagePath
  } catch (e: any) {
    out.err(e.message)
    out.err('执行失败', '图片路径拓展点执行失败，请检查！')
    process.exit(1)
  }
}

/**
 * 生成路径前缀
 * 固定格式 'prefix/'，开头无需/，结尾需要/，如果没传，则默认为空
 * @param prefix
 */

export const formattedPrefix = (prefix?: string): string => {
  // 如果没传，则默认为空
  if (!prefix) return ''

  let _prefix = prefix

  // 如果开头无需/
  if (_prefix.startsWith('/')) {
    _prefix = _prefix.slice(1)
  }

  // 如果结尾需要/
  if (!_prefix.endsWith('/')) {
    _prefix = `${_prefix}/`
  }

  return _prefix
}

export const resolvePluginPath = (pluginPath: string) => {
  const pluginLocalPath = path.resolve(process.cwd(), pluginPath)
  // 判断路径是否存在
  if (fs.existsSync(pluginLocalPath)) {
    // 如果路径存在，说明是具体路径，直接返回
    return pluginLocalPath
  } else {
    // 否则认为是包名，从 node_modules 中引入
    return pluginPath
    // 包不存在
  }
}

export const getPlugin = (plugin: ImagePlugin, config: ImageConfig) => {
  try {
    if (typeof plugin === 'string') {
      out.warning('注意', `正在使用图床插件: ${plugin}，请遵循图床插件开发规范`)
      const pluginLocalPath = resolvePluginPath(plugin)
      const PluginInstance = require(pluginLocalPath)
      return new PluginInstance(config)
    }
    if (typeof plugin === 'function') {
      out.warning('注意', `正在使用图床插件: ${plugin.name}，请遵循图床插件开发规范`)
      const PluginInstance = plugin as any
      return new PluginInstance(config)
    }
    // TODO 补充插件开发文档
    out.err('图床插件配置有误，请检查')
    process.exit(1)
  } catch (e: any) {
    if (e.message.includes('Cannot find module')) {
      // TODO 补充插件开发文档
      out.err('图床插件不存在，请检查')
    }
    process.exit(1)
  }
}
