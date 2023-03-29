const COS = {
  image: {
    enable: true,
    bed: 'cos',
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
    bed: 'github',
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
    bed: 'oss',
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
    bed: 'qiniu',
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
    bed: 'upyun',
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
    bed: 'local',
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
