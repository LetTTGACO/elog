#! /usr/bin/env node
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const pkg = require('../package.json')
const debugIndex = process.argv.findIndex((arg) => /^(--debug)$/.test(arg))
if (debugIndex > 0) {
  process.env.DEBUG = 'true'
}
import('./../dist/index.js').then((cli) => {
  cli.run({ version: pkg.version, name: pkg.name })
})
