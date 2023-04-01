export interface ImageUrl {
  url: string
  original: string
}

export interface ImageSource {
  fileName: string
  original: string
  url?: string
  upload: boolean
  buffer?: Buffer
}
