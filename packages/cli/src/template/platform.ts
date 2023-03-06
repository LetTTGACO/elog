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

const YuqueConfluence = {
  writing: {
    platform: 'yuque',
    login: '',
    repo: '',
    onlyPublic: true,
    onlyPublished: true,
  },
  deploy: {
    platform: 'confluence',
    confluence: {
      baseUrl: '',
      spaceKey: '',
      rootPageId: '',
    },
  },
}

export const platformTemplate: any = {
  'notion-default': NotionDefault,
  'yuque-default': YuqueDefault,
  'yuque-confluence': YuqueConfluence,
}
