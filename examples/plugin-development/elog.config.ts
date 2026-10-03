import { defineConfig } from '@elog/cli';
import fromJson from './src/from-json';
import appendFooter from './src/append-footer';
import toFiles from './src/to-files';

export default defineConfig({
  id: 'custom-plugins',
  from: fromJson({ file: 'documents.json' }),
  plugins: [appendFooter('由 Elog 自定义插件同步。')],
  to: toFiles({ outputDir: 'output' }),
});
