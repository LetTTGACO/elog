const yuqueConfig = {
  write: {
    platform: 'yuque',
    yuque: {
      login: '',
      repo: '',
      onlyPublic: false,
      onlyPublished: false,
    },
  },
}

const notionConfig = {
  write: {
    platform: 'notion',
    notion: {
      databaseId: '',
      status: {
        name: '',
        released: '',
        published: '',
      },
    },
  },
}

const localConfig = {
  deploy: {
    platform: 'local',
    local: {
      outputDir: '',
      filename: 'title | urlname',
      format: 'markdown | matter-markdown | wiki | html',
    },
  },
}

const confluenceConfig = {
  deploy: {
    platform: 'confluence',
    confluence: {
      baseUrl: '',
      spaceKey: '',
      rootPageId: '', // 可选
    },
  },
}

export const platformTemplate: any = {
  'yuque-local': { ...yuqueConfig, ...localConfig },
  'notion-local': { ...notionConfig, ...localConfig },
  'yuque-confluence': { ...yuqueConfig, ...confluenceConfig },
  'notion-confluence': { ...notionConfig, ...confluenceConfig },
}
