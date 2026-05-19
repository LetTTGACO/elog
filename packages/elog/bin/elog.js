#! /usr/bin/env node
import { run } from '../dist/index.js';
// CLI bin 只委托给已构建入口，避免源码运行时依赖 ts 编译能力。
void run();
