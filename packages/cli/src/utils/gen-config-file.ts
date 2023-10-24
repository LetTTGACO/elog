import fs from 'fs'

const configJsStr =
  'module.exports = {\n' +
  '  write: {\n' +
  "    platform: 'yuque',\n" +
  '    yuque: {\n' +
  '      token: process.env.YUQUE_TOKEN,\n' +
  '      login: process.env.YUQUE_LOGIN,\n' +
  '      repo: process.env.YUQUE_REPO,\n' +
  '      onlyPublic: false,\n' +
  '      onlyPublished: false,\n' +
  '    },\n' +
  "    'yuque-pwd': {\n" +
  '      username: process.env.YUQUE_USERNAME,\n' +
  '      password: process.env.YUQUE_PASSWORD,\n' +
  '      login: process.env.YUQUE_LOGIN,\n' +
  '      repo: process.env.YUQUE_REPO,\n' +
  '      onlyPublic: false,\n' +
  '      onlyPublished: false,\n' +
  '      linebreak: false,\n' +
  '    },\n' +
  '    notion: {\n' +
  '      token: process.env.NOTION_TOKEN,\n' +
  '      databaseId: process.env.NOTION_DATABASE_ID,\n' +
  "      filter: false, // {property: 'status', select: {equals: '已发布'}}\n" +
  "      sorts: false, // [{timestamp: 'created_time', direction: 'descending'}],\n" +
  '      catalog: false,\n' +
  '    },\n' +
  '    feishu: {\n' +
  '      folderToken: process.env.FEISHU_FOLDER_TOKEN,\n' +
  '      appId: process.env.FEISHU_APP_ID,\n' +
  '      appSecret: process.env.FEISHU_APP_SECRET,\n' +
  '    },\n' +
  '    flowus: {\n' +
  '      tablePageId: process.env.FLOWUS_TABLE_PAGE_ID,\n' +
  "      filter: false, // {property: 'status',value: '已发布'}\n" +
  "      sort: false, // { property: 'createdAt', direction: 'descending' }\n" +
  '      catalog: false,\n' +
  '    },\n' +
  '  },\n' +
  '  deploy: {\n' +
  "    platform: 'local',\n" +
  '    local: {\n' +
  "      outputDir: './docs',\n" +
  "      filename: 'title',\n" +
  "      format: 'markdown',\n" +
  '      catalog: false,\n' +
  "      formatExt: '',\n" +
  '    },\n' +
  '    confluence: {\n' +
  '      user: process.env.CONFLUENCE_USER,\n' +
  '      password: process.env.WORDPRESS_PASSWORD,\n' +
  '      endpoint: process.env.WORDPRESS_ENDPOINT,\n' +
  '      spaceKey: process.env.CONFLUENCE_SPACE_KEY,\n' +
  '      rootPageId: process.env.CONFLUENCE_ROOT_PAGE_ID, // 可选\n' +
  "      formatExt: '', // 可选\n" +
  '    },\n' +
  '    wordpress: {\n' +
  '      username: process.env.WORDPRESS_USERNAME,\n' +
  '      password: process.env.WORDPRESS_PASSWORD,\n' +
  '      endpoint: process.env.WORDPRESS_ENDPOINT,\n' +
  '      keyMap: {\n' +
  "        tags: 'tags',\n" +
  "        categories: 'categories',\n" +
  "        cover: 'cover',\n" +
  "        description: 'description',\n" +
  '      },\n' +
  "      formatExt: ''\n" +
  '    },\n' +
  '  },\n' +
  '  image: {\n' +
  '    enable: false,\n' +
  "    platform: 'local',\n" +
  '    local: {\n' +
  "      outputDir: './docs/images',\n" +
  "      prefixKey: '/images',\n" +
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

const configJson = JSON.stringify(
  {
    write: {
      platform: 'yuque',
      yuque: {
        token: '',
        baseUrl: '',
        login: '',
        repo: '',
        onlyPublic: false,
        onlyPublished: false,
      },
      notion: {
        token: '',
        databaseId: '',
        filter: true,
        sorts: true,
        catalog: {
          enable: false,
          property: 'catalog',
        },
      },
    },
    deploy: {
      platform: 'local',
      local: {
        outputDir: '',
        filename: 'title | urlname',
        format: 'markdown | matter-markdown | wiki | html',
        catalog: false,
        formatExt: '', // 可选
      },
      confluence: {
        user: '',
        password: '',
        baseUrl: '',
        spaceKey: '',
        rootPageId: '', // 可选
        formatExt: '', // 可选
      },
    },
    image: {
      enable: true,
      platform: 'cos',
      local: {
        outputDir: '',
        prefixKey: '',
      },
      oss: {
        secretId: '',
        secretKey: '',
        bucket: '',
        region: '',
        host: '',
        prefixKey: '',
        secretExt: '', // 可选
      },
      cos: {
        secretId: '',
        secretKey: '',
        bucket: '',
        region: '',
        host: '',
        prefixKey: '',
        secretExt: '', // 可选
      },
      qiniu: {
        secretId: '',
        secretKey: '',
        bucket: '',
        region: '',
        host: '',
        prefixKey: '',
        secretExt: '', // 可选
      },
      upyun: {
        user: '',
        password: '',
        bucket: '',
        host: '',
        prefixKey: '',
        secretExt: '', // 可选
      },
      github: {
        user: '',
        token: '',
        repo: '',
        branch: '',
        host: '',
        prefixKey: '',
        secretExt: '', // 可选
      },
    },
  },
  null,
  2,
)

export const genConfigFile = (configName: string) => {
  let str = configJsStr
  // 判断configName的后缀
  if (!configName.endsWith('.js')) {
    // 生成json文件
    str = configJson
  }
  fs.writeFileSync(`${process.cwd()}/${configName}`, str, {
    encoding: 'utf-8',
  })
}
