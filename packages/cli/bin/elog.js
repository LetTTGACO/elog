#! /usr/bin/env node

const debugIndex = process.argv.findIndex((arg) => /^(--debug)$/.test(arg))
if (debugIndex > 0) {
  process.env.DEBUG = 'true'
}

require('./../dist/index.js')
  .run()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e)
    process.exit(1)
  })
