import { DefaultConfig } from './default'
import { WordpressConfig } from './wordpress'

enum DeployPlatform {
  DEFAULT = 'default',
  CONFLUENCE = 'confluence',
}

export { DefaultConfig, WordpressConfig, DeployPlatform }
