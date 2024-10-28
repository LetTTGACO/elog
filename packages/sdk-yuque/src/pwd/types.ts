export interface YuqueWithPwdConfig {
  username: string
  password: string
  host?: string
  login: string
  repo: string
  linebreak?: boolean
  /** 保留公式代码而不是以图片形式 */
  keepLatexCode?: boolean
  onlyPublic?: boolean
  onlyPublished?: boolean
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
