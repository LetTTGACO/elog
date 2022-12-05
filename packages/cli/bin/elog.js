#! /usr/bin/env node
require('./../dist/cjs/index.js')
  .run()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
