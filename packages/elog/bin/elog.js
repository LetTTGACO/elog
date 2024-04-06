#! /usr/bin/env node
import { run } from '../dist/index.js';
const debugIndex = process.argv.findIndex((arg) => /^(--debug)$/.test(arg));
if (debugIndex > 0) {
  process.env.DEBUG = 'true';
}

void run();
