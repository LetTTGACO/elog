import elog from '@elogx-test/elog';
import yuque from '@elogx-test/plugin-from-yuque';
import local from '@elogx-test/plugin-to-local';
import imageElog from '@elogx-test/plugin-image-local';

elog({
  from: yuque({
    pwd: {
      username: '',
      password: '',
      login: '',
      repo: '',
      linebreak: false,
    },
  }),
  to: [
    local({
      outputDir: './docs',
      deployByStructure: true,
      filename: 'title',
      frontMatter: { enable: true },
    }),
  ],
  plugins: [
    imageElog({
      outputDir: './images',
      // prefixKey: '../../images',
      pathFollowDoc: { enable: true, docOutputDir: './docs' },
    }),
  ],
}).then();
