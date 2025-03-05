#! /usr/bin/env node

const debugIndex = process.argv.findIndex((arg) => /^(--debug)$/.test(arg))
if (debugIndex > 0) {
  process.env.DEBUG = 'true'
}

const importLocal = require('import-local')
if (importLocal(__filename)) {
  console.log('elog', '正在使用项目中的 elog cli')
} else {
  require('./../dist/index.js')
    .run()
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(e)
      process.exit(1)
    })
}
