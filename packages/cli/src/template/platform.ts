const NotionDefault = {
  writing: {
    platform: 'notion',
    databaseId: '',
    status: {
      name: '',
      published: '',
      released: '',
    },
  },
  deploy: {
    platform: 'default',
    postPath: 'source/_posts',
    mdNameFormat: 'title',
    adapter: 'matter-markdown',
  },
}

const YuqueDefault = {
  writing: {
    platform: 'yuque',
    login: '',
    repo: '',
    onlyPublic: true,
    onlyPublished: true,
  },
  deploy: {
    platform: 'default',
    postPath: 'source/_posts',
    mdNameFormat: 'title',
    adapter: 'matter-markdown',
  },
}

export const platformTemplate: any = {
  'notion-default': NotionDefault,
  'yuque-default': YuqueDefault,
}
