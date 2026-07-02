import elog from '@elog/cli';
import yuque from '@elog/plugin-from-yuque-token';
import local from '@elog/plugin-to-local';
import imageElog from '@elog/plugin-transform-image-local';

elog({
  from: yuque({
    token: '',
    login: '',
    repo: '',
    onlyPublic: false,
  }),
  to: [
    local({
      outputDir: './docs',
      keepToc: true,
      filename: 'title',
      frontMatter: { enable: true },
    }),
  ],
  plugins: [
    imageElog({
      outputDir: './images',
      pathFollowDoc: { enable: true, docOutputDir: './docs' },
    }),
  ],
}).then();
