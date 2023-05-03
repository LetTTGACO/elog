import { out } from '@elog/shared'
import path from 'path'

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
