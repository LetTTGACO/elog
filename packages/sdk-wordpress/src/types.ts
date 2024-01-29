export interface WordPressConfig {
  username: string
  password: string
  endpoint: string
  keyMap?: {
    tags?: string
    categories?: string
    urlname?: string
    cover?: string
    description?: string
  }
  namespace?: string
  formatExt?: string
  /** 是否需要上传文章中的图片 */
  needUploadImage?: boolean
}

/**
 * 文章详情
 */
export interface WordPressPost {
  id: number
  date: string
  date_gmt: string
  guid: {
    rendered: string
  }
  modified: string
  modified_gmt: string
  slug: string
  status: string
  type: string
  link: string
  title: {
    rendered: string
  }
  content: {
    rendered: string
    protected: boolean
  }
  excerpt: {
    rendered: string
    protected: boolean
  }
  author: number
  featured_media: number
  comment_status: string
  ping_status: string
  sticky: boolean
  template: string
  format: string
  meta: any[]
  categories: number[]
  tags: any[]
}

export interface WordPressBaseParams {
  title?: string
  content?: string
  status?: string
  slug?: string
  categories?: number | number[]
  tags?: number | number[]
  /** 特色图片 */
  featured_media?: number
  excerpt?: string
}

export interface CreateWordPressPost extends WordPressBaseParams {
  title: string
  content: string
}

export type UpdateWordPressPost = WordPressBaseParams

export interface WordPressCategory {
  id: number
  count: number
  description: string
  link: string
  name: string
  slug: string // 未分类uncategorized
  taxonomy: string // category
  parent: number
  meta: any[]
}

export interface WordPressTag {
  id: number
  count: number
  description: string
  link: string
  name: string
  slug: string
  taxonomy: string // post_tag
}

export interface WordPressMedia {
  id: number
  date: string
  date_gmt: string
  guid: {
    rendered: string
  }
  modified: string
  modified_gmt: string
  slug: string
  status: string
  type: string
  link: string
  title: {
    rendered: string
  }
  author: number
  comment_status: string
  ping_status: string
  template: string
  meta: any[]
  description: {
    rendered: string
  }
  caption: {
    rendered: string
  }
  alt_text: string
  media_type: string
  mime_type: string
  media_details: {
    width: number
    height: number
    file: string
    filesize: number
    sizes: {
      medium: {
        file: string
        width: number
        height: number
        filesize: number
        mime_type: string
        source_url: string
      }
      thumbnail: {
        file: string
        width: number
        height: number
        filesize: number
        mime_type: string
        source_url: string
      }
      full: {
        file: string
        width: number
        height: number
        mime_type: string
        source_url: string
      }
    }
    image_meta: {
      aperture: string
      credit: string
      camera: string
      caption: string
      created_timestamp: string
      copyright: string
      focal_length: string
      iso: string
      shutter_speed: string
      title: string
      orientation: string
      keywords: any[]
    }
  }
  post: number
  source_url: string
}

export interface WordPressMediaParams {
  /** 标题 */
  title?: string
  /** 替代文本 */
  alt_text?: string
  /** 说明文字 */
  caption?: string
  /** 描述 */
  description?: string
}
