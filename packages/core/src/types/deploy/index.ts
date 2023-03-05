import { DefaultConfig } from './default'
import { WordpressConfig } from './wordpress'

enum DeployPlatform {
  DEFAULT = 'default',
  WORDPRESS = 'wordpress',
  CONFLUENCE = 'confluence',
}

export { DefaultConfig, WordpressConfig, DeployPlatform }
