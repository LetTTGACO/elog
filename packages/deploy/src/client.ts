import DeployLocal from './platform/local'
import DeployConfluence from './platform/confluence'
import DeployWordPress from './platform/wordpress'
import { DeployPlatformEnum } from './const'
import { DeployConfig, LocalConfig } from './types'
import { ConfluenceConfig } from '@elog/sdk-confluence'
import { DocDetail } from '@elog/types'
import { WordPressConfig } from '@elog/sdk-wordpress'
import { HaloConfig } from '@elog/sdk-halo'
import DeployHalo from './platform/halo'

/**
 * 部署器
 */
class Deploy {
  config: DeployConfig
  deployClient: DeployLocal | DeployConfluence | DeployWordPress | DeployHalo

  constructor(config: DeployConfig) {
    this.config = config
    // 初始化部署方式
    this.deployClient = this.initDeploy()
  }

  initDeploy() {
    if (this.config.platform === DeployPlatformEnum.CONFLUENCE) {
      const config = this.config.confluence as ConfluenceConfig
      return new DeployConfluence(config)
    } else if (this.config.platform === DeployPlatformEnum.WORDPRESS) {
      const config = this.config.wordpress as WordPressConfig
      return new DeployWordPress(config)
    } else if (this.config.platform === DeployPlatformEnum.HALO) {
      const config = this.config.halo as HaloConfig
      return new DeployHalo(config)
    } else {
      const config = this.config.local as LocalConfig
      return new DeployLocal(config)
    }
  }

  /**
   * 部署配置
   * @param articleList
   * @param imageClient
   */
  async deploy(articleList: DocDetail[], imageClient?: any) {
    return this.deployClient.deploy(articleList, imageClient)
  }
}

export default Deploy
