const COS = {
  image: {
    enable: true,
    platform: 'cos',
    oss: {
      bucket: '',
      region: '',
      host: '',
      prefixKey: '',
    },
  },
}

const Github = {
  image: {
    enable: true,
    platform: 'github',
    github: {
      user: '',
      token: '',
      repo: '',
      branch: '',
      host: '',
      prefixKey: '',
    },
  },
}

const OSS = {
  image: {
    enable: true,
    platform: 'oss',
    oss: {
      bucket: '',
      region: '',
      host: '',
      prefixKey: '',
    },
  },
}

const QiNiu = {
  image: {
    enable: true,
    platform: 'qiniu',
    qiniu: {
      bucket: '',
      region: '',
      host: '',
      prefixKey: '',
    },
  },
}

const UPYun = {
  image: {
    enable: true,
    platform: 'upyun',
    upyun: {
      bucket: '',
      host: '',
      prefixKey: '',
    },
  },
}
const Local = {
  image: {
    enable: true,
    platform: 'local',
    local: {
      outputDir: '',
      prefixKey: '',
    },
  },
}

export const imageTemplate: any = {
  cos: COS,
  github: Github,
  oss: OSS,
  qiniu: QiNiu,
  upyun: UPYun,
  local: Local,
}
