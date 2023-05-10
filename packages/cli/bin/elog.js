#! /usr/bin/env node
require('./../dist/index.js')
  .run()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e)
    process.exit(1)
  })
