import { DefaultConfig } from './default'
import { WordpressConfig } from './wordpress'

enum DeployPlatform {
  DEFAULT = 'default',
  WORDPRESS = 'wordpress',
}

export { DefaultConfig, WordpressConfig, DeployPlatform }
