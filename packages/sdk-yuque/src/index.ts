export * from './types'

export { YuqueWithPwdConfig, YuqueLogin } from './pwd/types'
export { YuqueWithTokenConfig } from './token/types'

import YuqueWithToken from './token/core'
import YuqueWithPwd from './pwd/core'

export { YuqueWithToken, YuqueWithPwd }
