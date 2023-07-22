export interface YuqueWithPwdConfig {
  username: string
  password: string
  host?: string
  login: string
  repo: string
  linebreak?: boolean
  /** 下载并发数 */
  limit?: number
}

export interface YuqueLogin {
  ok: boolean
  goto: string
  user: {
    id: string
    login: string
    name: string
    description: string
  }
}

export interface YuqueLoginCookie {
  data: string
  time: number
}
