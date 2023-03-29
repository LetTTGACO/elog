import DeployLocal from './platform/local'
import DeployConfluence from './platform/confluence'
import { DeployPlatformEnum } from './const'
import { DeployConfig, LocalConfig } from './types'
import { ConfluenceConfig } from '@elog/sdk-confluence'
import { DocDetail } from '@elog/types'

/**
 * 部署器
 */
class Deploy {
  config: DeployConfig
  deployClient: any

  constructor(config: DeployConfig) {
    this.config = config
    // 初始化部署方式
    this.initDeploy()
  }

  initDeploy() {
    if (this.config.platform === DeployPlatformEnum.CONFLUENCE) {
      const config = this.config.confluence as ConfluenceConfig
      this.deployClient = new DeployConfluence(config)
    } else {
      const config = this.config.local as LocalConfig
      this.deployClient = new DeployLocal(config)
    }
  }

  /**
   * 部署配置
   * @param articleList
   */
  async deploy(articleList: DocDetail[]) {
    this.deployClient.deploy(articleList)
  }
}

export default Deploy
