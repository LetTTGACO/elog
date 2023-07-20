export interface YuqueWithPwdConfig {
  username: string
  password: string
  baseUrl?: string
  login: string
  repo: string
  linebreak?: boolean
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
