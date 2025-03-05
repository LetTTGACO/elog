#! /usr/bin/env node

const debugIndex = process.argv.findIndex((arg) => /^(--debug)$/.test(arg))
if (debugIndex > 0) {
  process.env.DEBUG = 'true'
}

const importLocal = require('import-local')
if (importLocal(__filename)) {
  function minimalInfoLog(prefix, message) {
    const stream = process.stderr
    const green = '\x1b[32m'
    const magenta = '\x1b[35m'
    const reset = '\x1b[0m'
    const useColor = stream.isTTY

    let output = ''

    if (useColor) {
      output += green // Info level color
    }
    output += 'info'
    if (useColor) {
      output += reset
    }

    if (prefix) {
      output += ' '
      if (useColor) {
        output += magenta // Prefix color
      }
      output += prefix
      if (useColor) {
        output += reset
      }
    }

    output += ' ' + message

    stream.write(output + '\n')
  }

  minimalInfoLog('elog', 'using local version of elog cli')
} else {
  require('./../dist/index.js')
    .run()
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(e)
      process.exit(1)
    })
}
