#! /usr/bin/env node

const debugIndex = process.argv.findIndex((arg) => /^(--debug)$/.test(arg))
if (debugIndex > 0) {
  process.env.DEBUG = 'true'
}

process.on('exit', (code) => {
  // 全局监听退出事件
  // TODO 区分不同的code
  // eslint-disable-next-line no-console
  console.error('请查阅Elog配置文档: https://elog.1874.cool/notion/start')
})

require('./../dist/index.js')
  .run()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e)
    process.exit(1)
  })
