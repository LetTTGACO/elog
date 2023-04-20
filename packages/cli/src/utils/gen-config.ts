import fs from 'fs'

const configStr =
  'module.exports = {\n' +
  '  write: {\n' +
  "    platform: 'yuque',\n" +
  '    yuque: {\n' +
  '      token: process.env.YUQUE_TOKEN,\n' +
  "      baseUrl: '',\n" +
  '      login: process.env.YUQUE_LOGIN,\n' +
  '      repo: process.env.YUQUE_REPO,\n' +
  '      onlyPublic: false,\n' +
  '      onlyPublished: true,\n' +
  '    },\n' +
  '    notion: {\n' +
  '      token: process.env.NOTION_TOKEN,\n' +
  '      databaseId: process.env.NOTION_DATABASE_ID,\n' +
  '      status: {\n' +
  "        name: 'status',\n" +
  "        released: '待发布',\n" +
  "        published: '已发布',\n" +
  '      },\n' +
  '    },\n' +
  '  },\n' +
  '  deploy: {\n' +
  "    platform: 'local',\n" +
  '    local: {\n' +
  "      outputDir: '',\n" +
  "      filename: '',\n" +
  "      format: '',\n" +
  '      catalog: false,\n' +
  "      formatExt: '',\n" +
  '    },\n' +
  '    confluence: {\n' +
  '      user: process.env.CONFLUENCE_USER,\n' +
  '      password: process.env.CONFLUENCE_PASSWORD,\n' +
  '      baseUrl: process.env.CONFLUENCE_BASE_URL,\n' +
  '      spaceKey: process.env.CONFLUENCE_SPACE_KEY,\n' +
  '      rootPageId: process.env.CONFLUENCE_ROOT_PAGE_ID, // 可选\n' +
  "      formatExt: '', // 可选\n" +
  '    },\n' +
  '  },\n' +
  '  image: {\n' +
  '    enable: false,\n' +
  "    platform: 'local',\n" +
  '    local: {\n' +
  "      outputDir: '',\n" +
  "      prefixKey: '',\n" +
  '    },\n' +
  '    oss: {\n' +
  '      secretId: process.env.OSS_SECRET_ID,\n' +
  '      secretKey: process.env.OSS_SECRET_KEY,\n' +
  '      bucket: process.env.OSS_BUCKET,\n' +
  '      region: process.env.OSS_REGION,\n' +
  '      host: process.env.OSS_HOST,\n' +
  "      prefixKey: '',\n" +
  "      secretExt: '', // 可选\n" +
  '    },\n' +
  '    cos: {\n' +
  '      secretId: process.env.COS_SECRET_ID,\n' +
  '      secretKey: process.env.COS_SECRET_KEY,\n' +
  '      bucket: process.env.COS_BUCKET,\n' +
  '      region: process.env.COS_REGION,\n' +
  '      host: process.env.COS_HOST,\n' +
  "      prefixKey: '',\n" +
  "      secretExt: '', // 可选\n" +
  '    },\n' +
  '    qiniu: {\n' +
  '      secretId: process.env.QINIU_SECRET_ID,\n' +
  '      secretKey: process.env.QINIU_SECRET_KEY,\n' +
  '      bucket: process.env.QINIU_BUCKET,\n' +
  '      region: process.env.QINIU_REGION,\n' +
  '      host: process.env.QINIU_HOST,\n' +
  "      prefixKey: '',\n" +
  "      secretExt: '', // 可选\n" +
  '    },\n' +
  '    upyun: {\n' +
  '      user: process.env.UPYUN_USER,\n' +
  '      password: process.env.UPYUN_PASSWORD,\n' +
  '      bucket: process.env.UPYUN_BUCKET,\n' +
  '      host: process.env.UPYUN_HOST,\n' +
  "      prefixKey: '',\n" +
  "      secretExt: '', // 可选\n" +
  '    },\n' +
  '    github: {\n' +
  '      user: process.env.GITHUB_USER,\n' +
  '      token: process.env.GITHUB_TOKEN,\n' +
  '      repo: process.env.GITHUB_REPO,\n' +
  "      branch: '',\n" +
  "      host: '',\n" +
  "      prefixKey: '',\n" +
  "      secretExt: '', // 可选\n" +
  '    },\n' +
  '  },\n' +
  '}\n'

export const genConfig = (configName: string) => {
  fs.writeFileSync(`${process.cwd()}/${configName}`, configStr, {
    encoding: 'utf-8',
  })
}
