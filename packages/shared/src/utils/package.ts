import path from 'path'
import fs from 'fs'
import { PackageExt } from '../types'
import out from '../out'

/**
 * 解析包
 * @param pluginPath
 */
export const resolvePackageExtPath = (pluginPath: string) => {
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

/**
 * 从配置路径获取插件/拓展
 * @param packageExt
 */
export const getPackage = (packageExt: PackageExt) => {
  try {
    if (typeof packageExt === 'string') {
      out.warning('注意', `正在使用插件/拓展点: ${packageExt}，请遵循插件/拓展开发规范`)
      const packageLocalPath = resolvePackageExtPath(packageExt)
      return require(packageLocalPath)
      // return new PluginInstance(config)
    }
    if (typeof packageExt === 'function') {
      out.warning('注意', `正在使用插件/拓展点: ${packageExt.name}，请遵循插件/拓展开发规范`)
      return packageExt as any
    }
    out.err('插件/拓展点配置有误，请检查')
    process.exit(1)
  } catch (e: any) {
    if (e.message.includes('Cannot find module')) {
      out.err('插件/拓展点配置有误，请检查')
    }
    process.exit(1)
  }
}
