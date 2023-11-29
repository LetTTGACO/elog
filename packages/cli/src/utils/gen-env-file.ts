import fs from 'fs'

const envStr =
  '# 语雀（Token方式）\n' +
  'YUQUE_TOKEN=\n' +
  '# 语雀（帐号密码方式）\n' +
  'YUQUE_USERNAME=\n' +
  'YUQUE_PASSWORD=\n' +
  '# 语雀公共参数，使用语雀必填\n' +
  'YUQUE_LOGIN=\n' +
  'YUQUE_REPO=\n' +
  '\n' +
  '# Notion\n' +
  'NOTION_TOKEN=\n' +
  'NOTION_DATABASE_ID=\n' +
  '\n' +
  '#FlowUs\n' +
  'FLOWUS_TABLE_PAGE_ID=\n' +
  '\n' +
  '#飞书云文档\n' +
  'FEISHU_APP_ID=\n' +
  'FEISHU_APP_SECRET=\n' +
  'FEISHU_FOLDER_TOKEN=\n' +
  'FEISHU_WIKI_ID=\n' +
  '\n' +
  '# Halo\n' +
  'HALO_ENDPOINT=\n' +
  'HALO_TOKEN=\n' +
  'HALO_POLICY_NAME=\n' +
  '\n' +
  '# Confluence\n' +
  'CONFLUENCE_BASE_URL=\n' +
  'CONFLUENCE_USER=\n' +
  'CONFLUENCE_PASSWORD=\n' +
  'CONFLUENCE_SPACE_KEY=\n' +
  'CONFLUENCE_ROOT_PAGE_ID=\n' +
  '\n' +
  '# WordPress\n' +
  'WORDPRESS_USERNAME=\n' +
  'WORDPRESS_PASSWORD=\n' +
  'WORDPRESS_ENDPOINT=\n' +
  '\n' +
  '# 腾讯云\n' +
  'COS_SECRET_ID=\n' +
  'COS_SECRET_KEY=\n' +
  'COS_BUCKET=\n' +
  'COS_REGION=\n' +
  'COS_HOST=\n' +
  '\n' +
  '# 阿里云\n' +
  'OSS_SECRET_ID=\n' +
  'OSS_SECRET_KEY=\n' +
  'OSS_BUCKET=\n' +
  'OSS_REGION=\n' +
  'OSS_HOST=xxx.oss-cn-xxx.aliyuncs.com\n' +
  '\n' +
  '# 七牛云\n' +
  'QINIU_SECRET_ID=\n' +
  'QINIU_SECRET_KEY=\n' +
  'QINIU_BUCKET=\n' +
  'QINIU_REGION=\n' +
  'QINIU_HOST=\n' +
  '\n' +
  '# 又拍云\n' +
  'UPYUN_USER=\n' +
  'UPYUN_PASSWORD=\n' +
  'UPYUN_BUCKET=\n' +
  'UPYUN_HOST=xxx.xx.upaiyun.com\n' +
  '\n' +
  '# Github\n' +
  'GITHUB_USER=\n' +
  'GITHUB_TOKEN=\n' +
  'GITHUB_REPO=\n' +
  '\n'

export const genEnvFile = (envName: string) => {
  fs.writeFileSync(`${process.cwd()}/${envName}`, envStr, {
    encoding: 'utf-8',
  })
}
